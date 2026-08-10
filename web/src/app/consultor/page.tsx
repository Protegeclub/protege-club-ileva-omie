import { Banner } from '@/lib/ui/banner'
import { CardAtalho } from '@/lib/ui/card-atalho'
import { CardMetrica, calcularTendencia } from '@/lib/ui/card-metrica'
import { COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS } from '@/lib/apuracao/comissao-gerencial'
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
  const mostrarComissaoGerencial = codConsultor === COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS

  if (!linhaPropria) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Apuração ainda não gerada para este período. Peça ao Gestor para gerar.
      </div>
    )
  }

  const totalAdesoes = linhaPropria.detalhe?.adesoes?.length ?? 0
  const totalPlacasAtivadas = linhaPropria.detalhe?.placasAtivadas?.length ?? 0
  const totalRecorrencias = linhaPropria.detalhe?.recorrencias?.length ?? 0
  const totalDescontosRastreador = linhaPropria.detalhe?.descontosRastreador?.length ?? 0
  const totalInadimplentes = linhaPropria.detalhe?.inadimplentes?.length ?? 0
  const nivelGestao = calcularNivelGestao(totalPlacasAtivadas)
  const totalEquipe = linhasEquipe
    .filter((l) => l.cod_equipe === linhaPropria.cod_equipe)
    .reduce((soma, l) => soma + (l.detalhe?.adesoes?.length ?? 0), 0) - totalAdesoes

  const totalReceber = calcularTotalReceber(linhaPropria)
  const timeline = montarTimeline(linhaPropria)

  const adesoesAnterior = anterior?.detalhe?.adesoes?.length ?? 0
  const placasAnterior = anterior?.detalhe?.placasAtivadas?.length ?? 0
  const recorrenciasAnterior = anterior?.detalhe?.recorrencias?.length ?? 0
  const descontosRastreadorAnterior = anterior?.detalhe?.descontosRastreador?.length ?? 0

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
              {nomeConsultor}
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
            <p className="text-2xl font-bold tabular-nums">{formatarMoeda(totalReceber)}</p>
            <p className="text-xs text-white/50">Previsão para este período</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <h2 className="text-sm font-medium text-slate-400">Visão geral</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <CardMetrica
          icone={<IconeAdesao />}
          cor="orange"
          titulo="Adesões"
          valor={String(totalAdesoes)}
          tendenciaPct={calcularTendencia(totalAdesoes, adesoesAnterior)}
          valorAnterior={String(adesoesAnterior)}
        />
        <CardMetrica
          icone={<IconeRecorrencia />}
          cor="blue"
          titulo="Recorrências"
          valor={String(totalRecorrencias)}
          tendenciaPct={calcularTendencia(totalRecorrencias, recorrenciasAnterior)}
          valorAnterior={String(recorrenciasAnterior)}
        />
        <CardMetrica
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas"
          valor={String(totalPlacasAtivadas)}
          tendenciaPct={calcularTendencia(totalPlacasAtivadas, placasAnterior)}
          valorAnterior={String(placasAnterior)}
        />
        <CardMetrica
          icone={<IconeRastreador />}
          cor="red"
          titulo="Descontos rastreadores"
          valor={String(totalDescontosRastreador)}
          tendenciaPct={calcularTendencia(totalDescontosRastreador, descontosRastreadorAnterior)}
          valorAnterior={String(descontosRastreadorAnterior)}
        />
        <CardMetrica
          icone={<IconeAlerta />}
          cor="red"
          titulo="Inadimplentes"
          valor={String(totalInadimplentes)}
          descricao="Boletos em aberto"
        />
        <CardMetrica
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
      <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CardAtalho
          href={`/consultor/adesoes?${qs}`}
          icone={<IconeAdesao />}
          titulo="Adesões"
          descricao="Contratos e valores do período"
          cor="laranja"
        />
        <CardAtalho
          href={`/consultor/recorrencia?${qs}`}
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          descricao="Pagamentos recorrentes recebidos"
          cor="azul"
        />
        <CardAtalho
          href={`/consultor/rastreadores?${qs}`}
          icone={<IconeRastreador />}
          titulo="Descontos"
          descricao="Descontos de rastreadores"
          cor="vermelho"
        />
        <CardAtalho
          href={`/consultor/placas-ativadas?${qs}`}
          icone={<IconePlaca />}
          titulo="Placas"
          descricao="Placas ativadas no período"
          cor="navy"
        />
        <CardAtalho
          href="/consultor/inadimplentes"
          icone={<IconeAlerta />}
          titulo="Inadimplentes"
          descricao="Situação atual dos associados"
          cor="vermelho"
        />
      </div>

      {/* Resumo financeiro — card de Comissão de gerência só existe pra quem realmente pode
          ganhá-la (ver COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS em lib/apuracao/comissao-gerencial.ts),
          senão vira um card de R$0,00 sem sentido pros outros 188 consultores. */}
      <h2 className="text-sm font-medium text-slate-400">Resumo financeiro</h2>
      <div className={`grid gap-3 sm:grid-cols-2 ${mostrarComissaoGerencial ? 'lg:grid-cols-7' : 'lg:grid-cols-6'}`}>
        <CardMetrica
          icone={<IconeAdesao />}
          titulo="Adesão"
          valor={formatarMoeda(linhaPropria.total_adesao)}
          cor="orange"
          sparkline={evolucao.map((p) => p.totalAdesao)}
          dica="Soma dos boletos de Adesão pagos neste mês."
          alinharDica="esquerda"
        />
        <CardMetrica
          icone={<IconeTrofeu />}
          titulo="Comissão do plano de carreira"
          valor={formatarMoeda(linhaPropria.total_bonus_nivel)}
          cor="navy"
          sparkline={evolucao.map((p) => p.totalBonusNivel)}
          selo={nivelGestao?.titulo}
          dica="Valor do maior patamar de placas ativadas atingido neste mês, conforme a tabela do plano de carreira."
        />
        <CardMetrica
          icone={<IconeTrofeu />}
          titulo="Premiação individual"
          valor={formatarMoeda(linhaPropria.total_premiacao_individual)}
          cor="violet"
          sparkline={evolucao.map((p) => p.totalPremiacaoIndividual)}
          dica="R$50 por placa ativada neste mês, a partir de 10 placas ativadas."
        />
        {mostrarComissaoGerencial && (
          <CardMetrica
            icone={<IconeUsuarios />}
            titulo="Comissão de gerência"
            valor={formatarMoeda(linhaPropria.total_comissao_gerencial)}
            cor="teal"
            sparkline={evolucao.map((p) => p.totalComissaoGerencial)}
            dica="R$2,00 por placa ativada neste mês por outros consultores da equipe."
          />
        )}
        <CardMetrica
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          valor={formatarMoeda(linhaPropria.total_recorrencia)}
          cor="blue"
          sparkline={evolucao.map((p) => p.totalRecorrencia)}
          dica="Resultado de boletos de mensalidade pagos neste mês, pela data de pagamento (inclui parcelas atrasadas pagas agora)."
        />
        <CardMetrica
          icone={<IconeRastreador />}
          titulo="Desconto rastreadores"
          valor={formatarMoeda(linhaPropria.total_desconto_rastreador)}
          cor="red"
          corValor="text-red-600"
          sparkline={evolucao.map((p) => p.totalDescontoRastreador)}
          dica="R$100 por veículo com rastreador ativado neste mês."
        />
        <CardMetrica
          icone={<IconeCarteira />}
          titulo="Comissão líquida"
          valor={formatarMoeda(linhaPropria.total_liquido)}
          cor="navy"
          sparkline={evolucao.map((p) => p.totalLiquido)}
          dica="Soma de todos os valores acima: Adesão + Recorrência − Desconto de rastreadores + Premiação individual + Comissão de gerência + Comissão do plano de carreira."
          alinharDica="direita"
        />
      </div>

      {/* Gráficos */}
      <h2 className="text-sm font-medium text-slate-400">Evolução</h2>
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

      <h2 className="text-sm font-medium text-slate-400">Histórico</h2>
      <TimelineMovimentacoes itens={timeline} />
    </div>
  )
}
