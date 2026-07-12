import Link from 'next/link'
import { formatarMoeda } from '@/app/consultor/tipos'
import { carregarContextoGestorConsultor } from './dados'

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
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{contexto.erro}</div>
  }

  const { ano, mes, equipeAtiva, linhaPropria, linhasEquipe, nomeConsultor } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`

  if (!linhaPropria) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          {nomeConsultor} <span className="text-slate-400">#{codConsultor}</span>
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Apuração ainda não gerada para este período.{' '}
          <Link href="/gestor/gerar" className="underline hover:text-slate-600">
            Gerar agora
          </Link>
          .
        </div>
      </div>
    )
  }

  const totalAdesoes = linhaPropria.detalhe?.adesoes?.length ?? 0
  const totalEquipe = linhasEquipe
    .filter((l) => l.cod_equipe === linhaPropria.cod_equipe)
    .reduce((soma, l) => soma + (l.detalhe?.adesoes?.length ?? 0), 0) - totalAdesoes

  const totalReceber =
    linhaPropria.total_adesao +
    linhaPropria.total_recorrencia -
    linhaPropria.total_desconto_rastreador +
    linhaPropria.total_premiacao_individual +
    linhaPropria.total_premiacao_equipe

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {nomeConsultor} <span className="text-slate-400">#{codConsultor}</span> — referência{' '}
          {String(mes).padStart(2, '0')}/{ano}
        </p>
        <div className="flex items-center gap-3 rounded-full bg-slate-900 px-5 py-2 text-white">
          <span className="text-sm">Total a receber:</span>
          <span className="text-lg font-semibold">{formatarMoeda(totalReceber)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BotaoTela href={`/gestor/consultor/${codConsultor}/adesoes?${qs}`} label="Visualizar Adesões" />
        <BotaoTela href={`/gestor/consultor/${codConsultor}/recorrencia?${qs}`} label="Visualizar Recorrência" />
        <BotaoTela
          href={`/gestor/consultor/${codConsultor}/rastreadores?${qs}`}
          label="Visualizar descontos de rastreadores"
        />
        <BotaoTela href={`/gestor/consultor/${codConsultor}/inadimplentes`} label="Visualizar Inadimplentes" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card titulo="Total de Adesões" valor={String(totalAdesoes)} />
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
      </div>

      <a
        href={`/api/relatorios/consultor?tipo=dashboard&cod_consultor=${codConsultor}&${qs}`}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Baixar PDF
      </a>
    </div>
  )
}

function BotaoTela({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-md bg-slate-800 px-3 py-4 text-center text-sm font-medium text-white hover:bg-slate-700"
    >
      {label}
    </Link>
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-semibold ${corValor ?? 'text-slate-900'}`}>{valor}</p>
      {nota ? <p className="mt-1 text-xs text-slate-400">{nota}</p> : null}
    </div>
  )
}
