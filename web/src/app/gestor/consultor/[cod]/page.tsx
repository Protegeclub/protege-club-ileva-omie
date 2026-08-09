import {
  calcularTotalReceber,
  formatarMoeda,
  montarTimeline,
  NOMES_MESES,
} from '@/app/consultor/tipos'
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
import { calcularNivelGestao } from '@/lib/apuracao/bonus-nivel'
import { carregarContextoGestorConsultor } from './dados'

function iniciaisNome(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

export default async function GestorConsultorDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ cod: string }>
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string }>
}) {
  const { cod } = await params
  const codConsultor = Number(cod)
  const sp = await searchParams
  const contexto = await carregarContextoGestorConsultor(codConsultor, sp)

  if ('erro' in contexto) {
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, equipeAtiva, linhaPropria, linhasEquipe, nomeConsultor, equipeNome, anterior, evolucao } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`

  if (!linhaPropria) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {nomeConsultor} <span className="text-slate-400">#{codConsultor}</span>
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Apuração ainda não gerada para este período.{' '}
          <Botao href="/gestor/gerar" variante="destaque" tamanho="sm">
            Gerar agora
          </Botao>
        </div>
      </div>
    )
  }

  const totalAdesoes = linhaPropria.detalhe?.adesoes?.length ?? 0
  const totalPlacasAtivadas = linhaPropria.detalhe?.placasAtivadas?.length ?? 0
  const totalRecorrencias = linhaPropria.detalhe?.recorrencias?.length ?? 0
  const nivelGestao = calcularNivelGestao(totalPlacasAtivadas)
  const totalEquipe = linhasEquipe
    .filter((l) => l.cod_equipe === linhaPropria.cod_equipe)
    .reduce((soma, l) => soma + (l.detalhe?.adesoes?.length ?? 0), 0) - totalAdesoes

  const totalReceber = calcularTotalReceber(linhaPropria)
  const timeline = montarTimeline(linhaPropria)

  const adesoesAnterior = anterior?.detalhe?.adesoes?.length ?? 0
  const placasAnterior = anterior?.detalhe?.placasAtivadas?.length ?? 0
  const recorrenciasAnterior = anterior?.detalhe?.recorrencias?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-orange/90 text-lg font-semibold text-brand-navy">
            {iniciaisNome(nomeConsultor)}
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-brand-navy">
              {nomeConsultor} <span className="text-slate-400">#{codConsultor}</span>
              {nivelGestao && (
                <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-brand-orange">
                  {nivelGestao.titulo}
                </span>
              )}
            </h1>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CardKpi
          icone={<IconeAdesao />}
          cor="emerald"
          titulo="Adesões"
          valor={String(totalAdesoes)}
          tendenciaPct={calcularTendencia(totalAdesoes, adesoesAnterior)}
          valorAnterior={String(adesoesAnterior)}
        />
        <CardKpi
          icone={<IconeRecorrencia />}
          cor="violet"
          titulo="Recorrências"
          valor={String(totalRecorrencias)}
          tendenciaPct={calcularTendencia(totalRecorrencias, recorrenciasAnterior)}
          valorAnterior={String(recorrenciasAnterior)}
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
        <CardAtalho
          href={`/gestor/consultor/${codConsultor}/adesoes?${qs}`}
          icone={<IconeAdesao />}
          titulo="Adesões"
          descricao="Contratos e valores do período"
          cor="verde"
        />
        <CardAtalho
          href={`/gestor/consultor/${codConsultor}/recorrencia?${qs}`}
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          descricao="Pagamentos recorrentes recebidos"
          cor="verde"
        />
        <CardAtalho
          href={`/gestor/consultor/${codConsultor}/rastreadores?${qs}`}
          icone={<IconeRastreador />}
          titulo="Descontos"
          descricao="Descontos de rastreadores"
          cor="vermelho"
        />
        <CardAtalho
          href={`/gestor/consultor/${codConsultor}/placas-ativadas?${qs}`}
          icone={<IconePlaca />}
          titulo="Placas"
          descricao="Placas ativadas no período"
          cor="laranja"
        />
        <CardAtalho
          href={`/gestor/consultor/${codConsultor}/inadimplentes`}
          icone={<IconeAlerta />}
          titulo="Inadimplentes"
          descricao="Situação atual dos associados"
          cor="vermelho"
        />
      </div>

      {/* Resumo financeiro */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <CardFinanceiro
          icone={<IconeAdesao />}
          titulo="Adesão"
          valor={formatarMoeda(linhaPropria.total_adesao)}
          cor="#f19100"
          evolucao={evolucao}
          campo="totalAdesao"
          dica="Soma dos boletos de Adesão pagos neste mês."
          alinharDica="esquerda"
        />
        <CardFinanceiro
          icone={<IconeTrofeu />}
          titulo="Comissão do plano de carreira"
          valor={formatarMoeda(linhaPropria.total_bonus_nivel)}
          cor="#002a54"
          evolucao={evolucao}
          campo="totalBonusNivel"
          selo={nivelGestao?.titulo}
          dica="Valor do maior patamar de placas ativadas atingido neste mês, conforme a tabela do plano de carreira."
        />
        <CardFinanceiro
          icone={<IconeTrofeu />}
          titulo="Premiação individual"
          valor={formatarMoeda(linhaPropria.total_premiacao_individual)}
          cor="#7c3aed"
          evolucao={evolucao}
          campo="totalPremiacaoIndividual"
          dica="R$50 por placa ativada neste mês, a partir de 10 placas ativadas."
        />
        <CardFinanceiro
          icone={<IconeUsuarios />}
          titulo="Comissão de gerência"
          valor={formatarMoeda(linhaPropria.total_comissao_gerencial)}
          cor="#0d9488"
          evolucao={evolucao}
          campo="totalComissaoGerencial"
          dica="R$2,00 por placa ativada neste mês por outros consultores da equipe."
        />
        <CardFinanceiro
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          valor={formatarMoeda(linhaPropria.total_recorrencia)}
          cor="#25a9e1"
          evolucao={evolucao}
          campo="totalRecorrencia"
          dica="Resultado de boletos de mensalidade pagos neste mês, pela data de pagamento (inclui parcelas atrasadas pagas agora)."
        />
        <CardFinanceiro
          icone={<IconeRastreador />}
          titulo="Desconto rastreadores"
          valor={formatarMoeda(linhaPropria.total_desconto_rastreador)}
          cor="#ef4444"
          corTexto="text-red-600"
          evolucao={evolucao}
          campo="totalDescontoRastreador"
          dica="R$100 por veículo com rastreador ativado neste mês."
        />
        <CardFinanceiro
          icone={<IconeCarteira />}
          titulo="Comissão líquida"
          valor={formatarMoeda(linhaPropria.total_liquido)}
          cor="#002a54"
          evolucao={evolucao}
          campo="totalLiquido"
          dica="Soma de todos os valores acima: Adesão + Recorrência − Desconto de rastreadores + Premiação individual + Comissão de gerência + Comissão do plano de carreira."
          alinharDica="direita"
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
