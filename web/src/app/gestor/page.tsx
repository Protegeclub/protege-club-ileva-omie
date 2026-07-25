import Link from 'next/link'
import { NOMES_MESES } from '@/app/consultor/tipos'
import { montarDashboardMes } from '@/lib/apuracao/dashboard-mes'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { DonutComposicao, DonutStatus, LinhaEvolucao } from './dashboard-graficos'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Home do painel Gestor — visão geral do mês (KPIs + gráficos), separada da lista de
// consultores (que agora mora em /gestor/consultores, com filtros/ordenação/tabela). Tudo aqui é
// leitura/agregação do que já está calculado e salvo — ver lib/apuracao/dashboard-mes.ts.
export default async function GestorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

  const dados = await montarDashboardMes(ano, mes)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {NOMES_MESES[mes - 1]} {ano}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" className="flex items-center gap-2">
            <select
              name="mes"
              defaultValue={mes}
              aria-label="Mês"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {NOMES_MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
            <input
              name="ano"
              type="number"
              defaultValue={ano}
              aria-label="Ano"
              className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <Botao type="submit" variante="secundaria" className="h-11">Ver</Botao>
          </form>
          <Botao href="/gestor/consultores" variante="destaque" className="h-11">
            Ver Consultores
          </Botao>
        </div>
      </div>

      {/* KPIs — todos os totais que a apuração do Ileva já capta pra este mês */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <CardKpi titulo="Líquido" valor={formatarMoeda(dados.totalLiquido)} />
        <CardKpi titulo="Adesão" valor={formatarMoeda(dados.totalAdesao)} />
        <CardKpi titulo="Recorrência" valor={formatarMoeda(dados.totalRecorrencia)} />
        <CardKpi titulo="Desconto rastreador" valor={formatarMoeda(dados.totalDescontoRastreador)} />
        <CardKpi titulo="Placas ativadas" valor={String(dados.qtdPlacasAtivadas)} />
        <CardKpi titulo="Apurados" valor={`${dados.qtdConsultoresApurados}/${dados.qtdConsultoresAtivos}`} />
      </div>

      {/* Gráficos — leves de propósito: donuts finos e linhas finas, sem preenchimento de área */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LinhaEvolucao evolucao={dados.evolucao} />
        <DonutStatus statusContagem={dados.statusContagem} />
        <DonutComposicao totalAdesao={dados.totalAdesao} totalRecorrencia={dados.totalRecorrencia} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankingLista
          titulo="Top consultores — adesões no mês"
          itens={dados.rankingConsultores.map((c) => ({
            label: c.nomeConsultor,
            sub: c.equipe,
            valor: c.qtdAdesoes,
            href: `/gestor/consultor/${c.cod_consultor}`,
          }))}
        />
        <RankingLista
          titulo="Top equipes — adesões no mês"
          itens={dados.rankingEquipes.map((e) => ({
            label: e.equipe,
            sub: `${e.qtdConsultores} consultor(es)`,
            valor: e.qtdAdesoes,
            href: `/gestor/consultores?equipe=${encodeURIComponent(e.equipe)}`,
          }))}
        />
      </div>
    </div>
  )
}

function CardKpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Cartao>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{valor}</p>
    </Cartao>
  )
}

// Ranking sem Recharts de propósito — barrinha proporcional em CSS puro (mesmo espírito da
// barra da coluna Líquido em TabelaGestor.tsx), mais leve que montar mais um gráfico.
function RankingLista({
  titulo,
  itens,
}: {
  titulo: string
  itens: { label: string; sub: string; valor: number; href: string }[]
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <Cartao>
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      <div className="mt-4 space-y-4">
        {itens.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma apuração gerada neste período.</p>
        )}
        {itens.map((item) => (
          <Link key={item.href} href={item.href} className="group block">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800 group-hover:underline">{item.label}</span>
              <span className="text-slate-500">{item.valor}</span>
            </div>
            <p className="text-xs text-slate-400">{item.sub}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-navy"
                style={{ width: `${Math.max(2, (item.valor / max) * 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </Cartao>
  )
}
