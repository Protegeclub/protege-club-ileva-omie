import { Banner } from '@/lib/ui/banner'
import { Botao } from '@/lib/ui/botao'
import { CardAtalho } from '@/lib/ui/card-atalho'
import { CardFinanceiro } from '@/lib/ui/card-financeiro'
import { CardKpi, calcularTendencia } from '@/lib/ui/card-kpi'
import { AreaProducaoMensal, BarraAdesoesPorMes, DonutComposicaoConsultor } from '@/lib/ui/graficos-consultor'
import {
  IconeAdesao,
  IconeAlerta,
  IconeCarteira,
  IconePlaca,
  IconeRastreador,
  IconeRecorrencia,
  IconeTrofeu,
  IconeUsuarios,
} from '@/lib/ui/icones-sidebar'
import { TimelineMovimentacoes } from '@/lib/ui/timeline-movimentacoes'
import { carregarContextoConsultor } from './dados'
import { calcularTotalReceber, formatarMoeda, montarTimeline, NOMES_MESES } from './tipos'

function iniciaisNome(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

export default async function ConsultorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string }>
}) {
  const params = await searchParams
  const contexto = await carregarContextoConsultor(params)

  if ('erro' in contexto) {
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, equipeAtiva, linhaPropria, linhasEquipe, codConsultor, nomeConsultor, equipeNome, anterior, evolucao } =
    contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`

  if (!linhaPropria) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Apuração ainda não gerada para este período. Peça ao Gestor para gerar.
      </div>
    )
  }

  const totalAdesoes = linhaPropria.detalhe?.adesoes?.length ?? 0
  const totalPlacasAtivadas = linhaPropria.detalhe?.placasAtivadas?.length ?? 0
  const totalEquipe = linhasEquipe
    .filter((l) => l.cod_equipe === linhaPropria.cod_equipe)
    .reduce((soma, l) => soma + (l.detalhe?.adesoes?.length ?? 0), 0) - totalAdesoes

  const totalReceber = calcularTotalReceber(linhaPropria)
  const timeline = montarTimeline(linhaPropria)

  const adesoesAnterior = anterior?.detalhe?.adesoes?.length ?? 0
  const placasAnterior = anterior?.detalhe?.placasAtivadas?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-orange/90 text-lg font-semibold text-brand-navy">
            {iniciaisNome(nomeConsultor)}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">{nomeConsultor}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {equipeNome ? `${equipeNome} · ` : ''}Referência {NOMES_MESES[mes - 1]}/{ano}
            </p>
            <p className="mt-2 text-sm text-slate-400">Confira abaixo o resumo da sua produção.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl bg-brand-navy p-5 text-white shadow-sm lg:w-96">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white [&>svg]:h-6 [&>svg]:w-6">
            <IconeCarteira />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Total a receber</p>
            <p className="text-2xl font-bold">{formatarMoeda(totalReceber)}</p>
            <p className="text-xs text-white/50">Previsão para este período</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CardKpi
          icone={<IconeAdesao />}
          cor="emerald"
          titulo="Adesões"
          valor={String(totalAdesoes)}
          tendenciaPct={calcularTendencia(totalAdesoes, adesoesAnterior)}
          valorAnterior={String(adesoesAnterior)}
        />
        <CardKpi
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas"
          valor={String(totalPlacasAtivadas)}
          tendenciaPct={calcularTendencia(totalPlacasAtivadas, placasAnterior)}
          valorAnterior={String(placasAnterior)}
        />
        <CardKpi
          icone={<IconeUsuarios />}
          cor="blue"
          titulo="Produção da equipe"
          valor={String(Math.max(totalEquipe, 0))}
          descricao="Adesões dos colegas"
        />
        <CardKpi
          icone={<IconeTrofeu />}
          cor="navy"
          titulo="Premiação individual"
          valor={formatarMoeda(linhaPropria.total_premiacao_individual)}
          descricao="R$50 por placa a partir de 10 adesões pagas no mês"
        />
        <CardKpi
          icone={<IconeTrofeu />}
          cor="navy"
          titulo="Premiação liderança"
          valor={formatarMoeda(linhaPropria.total_premiacao_equipe)}
          descricao="Não faz parte do plano de carreira"
        />
      </div>

      {linhaPropria.total_comissao_gerencial > 0 && (
        <Banner tom="neutro">
          <span className="font-medium text-slate-700">
            Comissão de gerência: {formatarMoeda(linhaPropria.total_comissao_gerencial)}
          </span>{' '}
          — R$2,00 por placa ativada de outros consultores (
          {linhaPropria.detalhe?.comissaoGerencialPlacas?.totalPlacas ?? 0}{' '}
          {(linhaPropria.detalhe?.comissaoGerencialPlacas?.totalPlacas ?? 0) === 1 ? 'placa' : 'placas'} neste mês).
        </Banner>
      )}

      {/* Atalhos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CardAtalho href={`/consultor/adesoes?${qs}`} icone={<IconeAdesao />} titulo="Adesões" descricao="Contratos e valores do período" />
        <CardAtalho
          href={`/consultor/recorrencia?${qs}`}
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          descricao="Pagamentos recorrentes recebidos"
        />
        <CardAtalho
          href={`/consultor/rastreadores?${qs}`}
          icone={<IconeRastreador />}
          titulo="Descontos"
          descricao="Descontos de rastreadores"
        />
        <CardAtalho
          href={`/consultor/placas-ativadas?${qs}`}
          icone={<IconePlaca />}
          titulo="Placas"
          descricao="Placas ativadas no período"
        />
        <CardAtalho
          href={`/consultor/inadimplentes?cod=${codConsultor}`}
          icone={<IconeAlerta />}
          titulo="Inadimplentes"
          descricao="Situação atual dos associados"
        />
      </div>

      {/* Resumo financeiro */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CardFinanceiro
          icone={<IconeAdesao />}
          titulo="Adesão"
          valor={formatarMoeda(linhaPropria.total_adesao)}
          cor="#f19100"
          evolucao={evolucao}
          campo="totalAdesao"
        />
        <CardFinanceiro
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          valor={formatarMoeda(linhaPropria.total_recorrencia)}
          cor="#25a9e1"
          evolucao={evolucao}
          campo="totalRecorrencia"
        />
        <CardFinanceiro
          icone={<IconeRastreador />}
          titulo="Desconto rastreadores"
          valor={formatarMoeda(linhaPropria.total_desconto_rastreador)}
          cor="#ef4444"
          corTexto="text-red-600"
          evolucao={evolucao}
          campo="totalDescontoRastreador"
        />
        <CardFinanceiro
          icone={<IconeCarteira />}
          titulo="Comissão líquida"
          valor={formatarMoeda(linhaPropria.total_liquido)}
          cor="#002a54"
          evolucao={evolucao}
          campo="totalLiquido"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaProducaoMensal evolucao={evolucao} />
        <DonutComposicaoConsultor
          totalLiquido={linhaPropria.total_liquido}
          totalAdesao={linhaPropria.total_adesao}
          totalRecorrencia={linhaPropria.total_recorrencia}
          totalDescontoRastreador={linhaPropria.total_desconto_rastreador}
        />
        <BarraAdesoesPorMes evolucao={evolucao} />
      </div>

      <TimelineMovimentacoes itens={timeline} />

      <Botao
        href={`/api/relatorios/consultor?tipo=dashboard&cod_consultor=${codConsultor}&${qs}`}
        target="_blank"
        rel="noreferrer"
        variante="destaque"
      >
        Baixar PDF
      </Botao>
    </div>
  )
}
