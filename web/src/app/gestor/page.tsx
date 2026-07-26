import Link from 'next/link'
import { NOMES_MESES } from '@/app/consultor/tipos'
import { montarDashboardMes } from '@/lib/apuracao/dashboard-mes'
import { Botao } from '@/lib/ui/botao'
import { BotaoAtualizarPagina } from '@/lib/ui/botao-atualizar-pagina'
import { CardKpi, calcularTendencia } from '@/lib/ui/card-kpi'
import { Cartao } from '@/lib/ui/cartao'
import { IconeApurado, IconeCarteira, IconeAdesao, IconePlaca, IconeRastreador, IconeRecorrencia } from '@/lib/ui/icones-sidebar'
import { AreaEvolucao, BarraEquipes, DonutComposicao, DonutStatus } from './dashboard-graficos'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "Hoje às 15:34" quando é o mesmo dia; "23/07 às 15:34" caso contrário — mesmo padrão já usado
// em gestor/TabelaGestor.tsx (consultores).
function formatarUltimaAtualizacao(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const mesmoDia = data.toDateString() === hoje.toDateString()
  if (mesmoDia) return `Hoje às ${hora}`
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`
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
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Resumo executivo da operação comercial.</p>
          <p className="mt-3 text-xs text-slate-400">
            {dados.ultimaAtualizacao
              ? `Última atualização: ${formatarUltimaAtualizacao(dados.ultimaAtualizacao)}`
              : 'Nenhuma apuração gerada neste período ainda'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoAtualizarPagina />
          <Botao href="/gestor/consultores" variante="destaque" className="h-11">
            Ver Consultores
          </Botao>
        </div>
      </div>

      <Cartao className="flex flex-wrap items-end gap-3 p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="mes" className="block text-xs font-medium text-slate-500">
              Mês
            </label>
            <select
              id="mes"
              name="mes"
              defaultValue={mes}
              className="mt-1.5 h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {NOMES_MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ano" className="block text-xs font-medium text-slate-500">
              Ano
            </label>
            <input
              id="ano"
              name="ano"
              type="number"
              defaultValue={ano}
              className="mt-1.5 h-11 w-24 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <Botao type="submit" variante="primaria" className="h-11">Ver período</Botao>
        </form>
      </Cartao>

      {/* KPIs — mesmo card compartilhado com Consultores/Gerar apuração (ver lib/ui/card-kpi.tsx).
          Desconto rastreador não mostra seta de tendência de propósito: é um valor descontado dos
          consultores, então "subir" não é necessariamente bom — mostrar "▲ verde" seria enganoso. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <CardKpi
          icone={<IconeCarteira />}
          cor="blue"
          titulo="Comissão líquida"
          valor={formatarMoeda(dados.totalLiquido)}
          tendenciaPct={calcularTendencia(dados.totalLiquido, dados.anterior.totalLiquido)}
          valorAnterior={formatarMoeda(dados.anterior.totalLiquido)}
        />
        <CardKpi
          icone={<IconeAdesao />}
          cor="emerald"
          titulo="Adesão"
          valor={formatarMoeda(dados.totalAdesao)}
          tendenciaPct={calcularTendencia(dados.totalAdesao, dados.anterior.totalAdesao)}
          valorAnterior={formatarMoeda(dados.anterior.totalAdesao)}
        />
        <CardKpi
          icone={<IconeRecorrencia />}
          cor="violet"
          titulo="Recorrência"
          valor={formatarMoeda(dados.totalRecorrencia)}
          tendenciaPct={calcularTendencia(dados.totalRecorrencia, dados.anterior.totalRecorrencia)}
          valorAnterior={formatarMoeda(dados.anterior.totalRecorrencia)}
        />
        <CardKpi
          icone={<IconeRastreador />}
          cor="navy"
          titulo="Desconto rastreador"
          valor={formatarMoeda(dados.totalDescontoRastreador)}
          descricao="Descontado dos consultores"
        />
        <CardKpi
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas"
          valor={String(dados.qtdPlacasAtivadas)}
          descricao="Este mês"
        />
        <CardKpi
          icone={<IconeApurado />}
          cor="navy"
          titulo="Apurados"
          valor={`${dados.qtdConsultoresApurados}/${dados.qtdConsultoresAtivos}`}
          descricao="Consultores apurados"
        />
      </div>

      {/* Gráficos — leves de propósito: donuts finos e área com gradiente sutil, sem poluir */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaEvolucao evolucao={dados.evolucao} />
        <DonutStatus statusContagem={dados.statusContagem} />
        <DonutComposicao
          totalLiquido={dados.totalLiquido}
          totalAdesao={dados.totalAdesao}
          totalRecorrencia={dados.totalRecorrencia}
        />
        <BarraEquipes rankingEquipes={dados.rankingEquipes} />
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

// Avatar circular com iniciais — mesmo padrão visual de TabelaGestor.tsx/gerar-lote-form.tsx
// (cor determinística, só decorativo), duplicado aqui pelo mesmo motivo de sempre: cada tela
// mantém sua própria lista com formato ligeiramente diferente.
const CORES_AVATAR = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
]

function iniciaisNome(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}

function medalhaPosicao(indice: number) {
  if (indice === 0) return '🥇'
  if (indice === 1) return '🥈'
  if (indice === 2) return '🥉'
  return null
}

// Ranking sem Recharts de propósito — barrinha proporcional em CSS puro (mesmo espírito da
// barra da coluna Líquido em TabelaGestor.tsx), mais leve que montar mais um gráfico. Cada item
// ganha avatar com iniciais + badge de posição (medalha nos 3 primeiros, número nos demais).
function RankingLista({
  titulo,
  itens,
}: {
  titulo: string
  itens: { label: string; sub: string; valor: number; href: string }[]
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      <div className="mt-4 space-y-1">
        {itens.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma apuração gerada neste período.</p>
        )}
        {itens.map((item, i) => {
          const medalha = medalhaPosicao(i)
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="group -mx-2 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-sm font-semibold text-slate-400">
                {medalha ?? i + 1}
              </span>
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${CORES_AVATAR[i % CORES_AVATAR.length]}`}
              >
                {iniciaisNome(item.label)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800 group-hover:underline">{item.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{item.valor}</span>
                </div>
                <p className="truncate text-xs text-slate-400">{item.sub}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-navy transition-all duration-500"
                    style={{ width: `${Math.max(2, (item.valor / max) * 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </Cartao>
  )
}
