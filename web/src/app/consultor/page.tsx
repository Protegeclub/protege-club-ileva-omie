import { Banner } from '@/lib/ui/banner'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { carregarContextoConsultor } from './dados'
import { calcularTotalReceber, formatarMoeda } from './tipos'

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

  const { ano, mes, equipeAtiva, linhaPropria, linhasEquipe, codConsultor } = contexto
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {contexto.nomeConsultor} — referência {String(mes).padStart(2, '0')}/{ano}
        </p>
        <div className="flex items-center gap-3 rounded-full bg-brand-navy px-5 py-2 text-white">
          <span className="text-sm">Total a receber:</span>
          <span className="text-lg font-semibold">{formatarMoeda(totalReceber)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Botao href={`/consultor/adesoes?${qs}`} variante="secundaria" className="h-full py-4 text-center">
          Visualizar Adesões
        </Botao>
        <Botao href={`/consultor/recorrencia?${qs}`} variante="secundaria" className="h-full py-4 text-center">
          Visualizar Recorrência
        </Botao>
        <Botao href={`/consultor/rastreadores?${qs}`} variante="secundaria" className="h-full py-4 text-center">
          Visualizar descontos de rastreadores
        </Botao>
        <Botao href={`/consultor/placas-ativadas?${qs}`} variante="secundaria" className="h-full py-4 text-center">
          Visualizar Placas Ativadas
        </Botao>
        <Botao href={`/consultor/inadimplentes?cod=${codConsultor}`} variante="secundaria" className="h-full py-4 text-center">
          Visualizar Inadimplentes
        </Botao>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card titulo="Total de Adesões" valor={String(totalAdesoes)} />
        <Card
          titulo="Placas Ativadas"
          valor={String(totalPlacasAtivadas)}
          nota="Contratos iniciados no período (visão operacional, não é comissão)"
        />
        <Card titulo="Total - Equipe" valor={String(Math.max(totalEquipe, 0))} />
        <Card
          titulo="Premiação Individual"
          valor={formatarMoeda(linhaPropria.total_premiacao_individual)}
          nota="Regras do plano de carreira ainda não definidas"
        />
        <Card
          titulo="Premiação Líder de equipe"
          valor={formatarMoeda(linhaPropria.total_premiacao_equipe)}
          nota="Regras do plano de carreira ainda não definidas"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card titulo="Adesão" valor={formatarMoeda(linhaPropria.total_adesao)} />
        <Card titulo="Recorrência" valor={formatarMoeda(linhaPropria.total_recorrencia)} />
        <Card
          titulo="Desconto Rastreadores"
          valor={formatarMoeda(linhaPropria.total_desconto_rastreador)}
          corValor="text-red-600"
        />
        {linhaPropria.total_comissao_gerencial > 0 && (
          <Card
            titulo="Comissão de Gerência"
            valor={formatarMoeda(linhaPropria.total_comissao_gerencial)}
            nota={`R$2,00 por placa ativada de outros consultores (${
              linhaPropria.detalhe?.comissaoGerencialPlacas?.totalPlacas ?? 0
            } ${(linhaPropria.detalhe?.comissaoGerencialPlacas?.totalPlacas ?? 0) === 1 ? 'placa' : 'placas'} neste mês)`}
          />
        )}
      </div>

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

function Card({
  titulo,
  valor,
  nota,
  corValor,
}: {
  titulo: string
  valor: string
  nota?: string
  corValor?: string
}) {
  return (
    <Cartao>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-semibold ${corValor ?? 'text-slate-900'}`}>{valor}</p>
      {nota ? <p className="mt-1 text-xs text-slate-400">{nota}</p> : null}
    </Cartao>
  )
}
