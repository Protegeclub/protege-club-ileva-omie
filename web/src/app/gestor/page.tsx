import type { ReactNode } from 'react'
import Link from 'next/link'
import { NOMES_MESES, periodoPadrao } from '@/app/consultor/tipos'
import { montarDashboardMes, type DashboardMes } from '@/lib/apuracao/dashboard-mes'
import { Botao } from '@/lib/ui/botao'
import { CardMetrica, calcularProgresso, calcularTendencia } from '@/lib/ui/card-metrica'
import { Cartao } from '@/lib/ui/cartao'
import {
  IconeAdesao,
  IconeAlerta,
  IconeApurado,
  IconeCarteira,
  IconePlaca,
  IconeRastreador,
  IconeRecorrencia,
  IconeTrofeu,
  IconeUsuario,
  IconeUsuarios,
} from '@/lib/ui/icones-sidebar'
import {
  AreaEvolucao,
  DonutComposicao,
  GraficoDescontoRastreador,
  GraficoPlacasAtivadas,
  GraficoTotalLiquido,
} from './dashboard-graficos'
import { IconeRelampago, IconeRelogio } from './gerar/icones'
import { SeletorCompetencia } from './seletor-competencia'

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
//
// Redesign visual (pedido do Samuel, 01/08/2026, referência: Stripe/Linear/Attio) — nenhum
// número novo foi calculado aqui, só reorganização/estilo. Ver dashboard-mes.ts pra saber de
// onde cada valor exibido vem.
export default async function GestorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const padrao = periodoPadrao()
  const ano = Number(params.ano) || padrao.ano
  const mes = Number(params.mes) || padrao.mes

  const dados = await montarDashboardMes(ano, mes)
  const evolucaoLiquido = dados.evolucao.map((p) => p.totalLiquido)
  const evolucaoAdesao = dados.evolucao.map((p) => p.totalAdesao)
  const evolucaoRecorrencia = dados.evolucao.map((p) => p.totalRecorrencia)

  return (
    <div className="space-y-5">
      {/* Header (pedido do Samuel, 10/08/2026, com print de referência): breadcrumb + título +
          subtítulo com a competência embutida no texto, à esquerda; seletor de competência
          único (mês+ano combinados, ver seletor-competencia.tsx) + os dois CTAs, à direita. A
          "Última atualização" que morava aqui saiu — já existe como item do ResumoOperacional
          (rodapé fixo da página), então não duplicava a informação em dois lugares. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">Painel / Comercial</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-brand-navy">Dashboard comercial</h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumo executivo da operação — competência de {NOMES_MESES[mes - 1].toLowerCase()} de {ano}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorCompetencia ano={ano} mes={mes} />
          <Botao href="/gestor/consultores" variante="fantasma" className="h-11">
            <IconeUsuario className="h-4 w-4" />
            Ver consultores
          </Botao>
          <Botao href="/gestor/gerar" variante="destaque" className="h-11">
            <IconeRelampago className="h-4 w-4" />
            Gerar apuração
          </Botao>
        </div>
      </div>

      {/* KPIs — mesmo card compartilhado com Consultores/Gerar apuração (ver lib/ui/card-metrica.tsx).
          Sparkline/anel são só decoração adicional (props novas, opcionais) reaproveitando dados
          que a página já buscava (evolução de 6 meses / total do mês anterior / apurados-ativos).
          Desconto rastreador não mostra seta de tendência de propósito: é um valor descontado dos
          consultores, então "subir" não é necessariamente bom — mostrar "▲ verde" seria enganoso. */}
      <h2 className="text-sm font-medium text-slate-400">Resumo</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {/* Comissão líquida em destaque (~1.4x maior) — é o número que mais importa pro Gestor,
            os outros 5 tinham exatamente o mesmo peso visual antes (pedido do Samuel, 04/08/2026). */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <CardMetrica
            icone={<IconeCarteira />}
            cor="blue"
            titulo="Comissão líquida"
            valor={formatarMoeda(dados.totalLiquido)}
            tendenciaPct={calcularTendencia(dados.totalLiquido, dados.anterior.totalLiquido)}
            valorAnterior={formatarMoeda(dados.anterior.totalLiquido)}
            sparkline={evolucaoLiquido}
            progresso={calcularProgresso(dados.totalLiquido, dados.anterior.totalLiquido) ?? undefined}
            destaque
          />
        </div>
        <CardMetrica
          icone={<IconeAdesao />}
          cor="orange"
          titulo="Adesão"
          valor={formatarMoeda(dados.totalAdesao)}
          tendenciaPct={calcularTendencia(dados.totalAdesao, dados.anterior.totalAdesao)}
          valorAnterior={formatarMoeda(dados.anterior.totalAdesao)}
          sparkline={evolucaoAdesao}
          progresso={calcularProgresso(dados.totalAdesao, dados.anterior.totalAdesao) ?? undefined}
        />
        <CardMetrica
          icone={<IconeRecorrencia />}
          cor="blue"
          titulo="Recorrência"
          valor={formatarMoeda(dados.totalRecorrencia)}
          tendenciaPct={calcularTendencia(dados.totalRecorrencia, dados.anterior.totalRecorrencia)}
          valorAnterior={formatarMoeda(dados.anterior.totalRecorrencia)}
          sparkline={evolucaoRecorrencia}
          progresso={calcularProgresso(dados.totalRecorrencia, dados.anterior.totalRecorrencia) ?? undefined}
        />
        <CardMetrica
          icone={<IconeRastreador />}
          cor="navy"
          titulo="Desconto rastreador"
          valor={formatarMoeda(dados.totalDescontoRastreador)}
          descricao="Descontado dos consultores"
          sparkline={[dados.anterior.totalDescontoRastreador, dados.totalDescontoRastreador]}
        />
        <CardMetrica
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas"
          valor={String(dados.qtdPlacasAtivadas)}
          descricao="Este mês"
          sparkline={[dados.anterior.qtdPlacasAtivadas, dados.qtdPlacasAtivadas]}
        />
        <CardMetrica
          icone={<IconeApurado />}
          cor="navy"
          titulo="Apurados"
          valor={`${dados.qtdConsultoresApurados}/${dados.qtdConsultoresAtivos}`}
          descricao="Consultores apurados"
          anelProgresso={{ atual: dados.qtdConsultoresApurados, total: dados.qtdConsultoresAtivos }}
        />
      </div>

      {/* Gráfico principal — sozinho na linha, de propósito (era dividido com os donuts antes;
          agora cada bloco tem seu próprio espaço, mais fácil de ler). */}
      <h2 className="text-sm font-medium text-slate-400">Evolução</h2>
      <AreaEvolucao evolucao={dados.evolucao} />

      {/* Segunda linha — composição do líquido + os dois indicadores mensais que antes só
          apareciam como tendência no card de KPI (agora com o próprio gráfico de 6 meses). O
          antigo donut "Status das apurações" saiu daqui por pedido do Samuel (01/08/2026): é
          quase sempre ~100% gerado, então não rendia gráfico — o número de erros/pendentes
          continua disponível em texto no Resumo operacional/Insights, só não como gráfico. */}
      <h2 className="text-sm font-medium text-slate-400">Composição e indicadores</h2>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <DonutComposicao
          totalLiquido={dados.totalLiquido}
          totalAdesao={dados.totalAdesao}
          totalRecorrencia={dados.totalRecorrencia}
        />
        <GraficoTotalLiquido evolucao={dados.evolucao} atual={dados.totalLiquido} />
        <GraficoPlacasAtivadas evolucao={dados.evolucao} atual={dados.qtdPlacasAtivadas} />
        <GraficoDescontoRastreador evolucao={dados.evolucao} atual={dados.totalDescontoRastreador} />
      </div>

      {/* Terceira linha — Top 5 por líquido (mesmo total já calculado por linha.total_liquido
          na apuração, só reordenado pra exibição) + insights derivados só dos números já
          exibidos acima, sem IA nem chamada nova. */}
      <h2 className="text-sm font-medium text-slate-400">Destaques</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        <RankingLista
          titulo="Top 5 consultores — por líquido"
          itens={dados.rankingConsultoresPorLiquido.map((c) => ({
            label: c.nomeConsultor,
            valor: c.totalLiquido,
            href: `/gestor/consultor/${c.cod_consultor}`,
          }))}
          formatarValor={formatarMoeda}
        />
        <InsightsDoMes dados={dados} />
      </div>

      <ResumoOperacional dados={dados} ano={ano} mes={mes} />
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
// `sub` é opcional: o Top 5 por líquido, por pedido, mostra só avatar/nome/valor/barra/ranking.
function RankingLista({
  titulo,
  itens,
  formatarValor = (v) => String(v),
}: {
  titulo: string
  itens: { label: string; sub?: string; valor: number; href: string }[]
  formatarValor?: (v: number) => string
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <IconeTrofeu className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-600">Nenhum ranking disponível</p>
          <p className="mt-1 max-w-[220px] text-xs text-slate-400">
            Realize a primeira apuração para visualizar os consultores com maior comissão.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-1">
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
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{formatarValor(item.valor)}</span>
                </div>
                {item.sub ? <p className="truncate text-xs text-slate-400">{item.sub}</p> : null}
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
      )}
    </Cartao>
  )
}

interface Insight {
  icone: ReactNode
  titulo: string
  descricao: string
  tom: 'positivo' | 'negativo' | 'neutro'
}

const TOM_INSIGHT: Record<Insight['tom'], string> = {
  positivo: 'bg-emerald-50 text-emerald-600',
  negativo: 'bg-red-50 text-red-600',
  neutro: 'bg-brand-navy/10 text-brand-navy',
}

// Só deriva texto a partir de números que a própria página já buscou (dashboard-mes.ts) — sem
// IA, sem API nova, sem tabela nova. Mostra só os insights com base de comparação real (ex.:
// sem apuração do mês anterior, não inventa "▲/▼ 100%").
function gerarInsights(dados: DashboardMes): Insight[] {
  const insights: Insight[] = []

  const tendLiquido = calcularTendencia(dados.totalLiquido, dados.anterior.totalLiquido)
  if (tendLiquido != null) {
    const subiu = tendLiquido >= 0
    insights.push({
      icone: <IconeCarteira className="h-4 w-4" />,
      titulo: `Comissão líquida ${subiu ? 'maior' : 'menor'} que o mês anterior`,
      descricao: `${subiu ? '+' : '-'}${Math.abs(Math.round(tendLiquido))}% em relação ao período anterior`,
      tom: subiu ? 'positivo' : 'negativo',
    })
  }

  insights.push(
    dados.statusContagem.erro === 0
      ? {
          icone: <IconeApurado className="h-4 w-4" />,
          titulo: 'Nenhum erro encontrado na apuração',
          descricao: 'Todos os dados foram processados com sucesso.',
          tom: 'positivo',
        }
      : {
          icone: <IconeAlerta className="h-4 w-4" />,
          titulo: `${dados.statusContagem.erro} erro(s) encontrado(s) na apuração`,
          descricao: 'Revise os consultores com falha antes de fechar o mês.',
          tom: 'negativo',
        }
  )

  if (dados.rankingEquipes[0]) {
    // Sem prefixo "Equipe" fixo: o nome já vem do Ileva e algumas equipes já incluem a palavra
    // "Equipe" no próprio nome (ex.: "Protege Club - Equipe") — prefixar de novo duplicava.
    insights.push({
      icone: <IconeTrofeu className="h-4 w-4" />,
      titulo: `${dados.rankingEquipes[0].equipe} lidera o mês em adesões`,
      descricao: `${dados.rankingEquipes[0].qtdAdesoes} adesões no período`,
      tom: 'neutro',
    })
  }

  const tendRecorrencia = calcularTendencia(dados.totalRecorrencia, dados.anterior.totalRecorrencia)
  if (tendRecorrencia != null) {
    const subiu = tendRecorrencia >= 0
    insights.push({
      icone: <IconeRecorrencia className="h-4 w-4" />,
      titulo: `Recorrência ${subiu ? 'aumentou' : 'caiu'} em relação ao mês anterior`,
      descricao: `${subiu ? '+' : '-'}${Math.abs(Math.round(tendRecorrencia))}% vs mês anterior`,
      tom: subiu ? 'positivo' : 'negativo',
    })
  }

  const tendRastreador = calcularTendencia(dados.totalDescontoRastreador, dados.anterior.totalDescontoRastreador)
  if (tendRastreador != null) {
    const subiu = tendRastreador >= 0
    insights.push({
      icone: <IconeRastreador className="h-4 w-4" />,
      // Desconto de rastreador é descontado do consultor — cair é bom pra eles, por isso o tom
      // é invertido em relação às outras tendências.
      titulo: `Desconto de rastreador ${subiu ? 'aumentou' : 'caiu'}`,
      descricao: `${subiu ? '+' : '-'}${Math.abs(Math.round(tendRastreador))}% vs mês anterior`,
      tom: subiu ? 'negativo' : 'positivo',
    })
  }

  return insights.slice(0, 5)
}

// "há Xh"/"há Xd" a partir do timestamp real da última apuração gerada (dados.ultimaAtualizacao)
// — todos os insights vêm do mesmo conjunto de dados gerado naquele momento, então o mesmo
// relativo vale pra cada item. Nunca um horário fabricado por item.
function formatarRelativo(iso: string | null): string {
  if (!iso) return ''
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const horas = Math.round(diffMin / 60)
  if (horas < 24) return `há ${horas}h`
  return `há ${Math.round(horas / 24)}d`
}

function InsightsDoMes({ dados }: { dados: DashboardMes }) {
  const insights = gerarInsights(dados)
  const relativo = formatarRelativo(dados.ultimaAtualizacao)
  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Insights do mês</p>
      {insights.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Sem dados suficientes neste período para gerar insights.</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {insights.map((insight) => (
            <div key={insight.titulo} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TOM_INSIGHT[insight.tom]}`}>
                {insight.icone}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{insight.titulo}</p>
                <p className="text-xs text-slate-400">{insight.descricao}</p>
              </div>
              {relativo && <span className="shrink-0 text-[11px] text-slate-300">{relativo}</span>}
            </div>
          ))}
        </div>
      )}
    </Cartao>
  )
}

// Substitui o antigo card lateral de status da API iLeva (fila/tempo médio/erros — informação
// operacional de baixo nível, não executiva) por um resumo horizontal com só o que interessa pro
// Gestor: se a competência fechou, quantos consultores entraram, e se sobrou alguma pendência.
function ResumoOperacional({ dados, ano, mes }: { dados: DashboardMes; ano: number; mes: number }) {
  const completo = dados.qtdConsultoresAtivos > 0 && dados.qtdConsultoresApurados === dados.qtdConsultoresAtivos
  const pctApurado =
    dados.qtdConsultoresAtivos > 0 ? Math.round((dados.qtdConsultoresApurados / dados.qtdConsultoresAtivos) * 100) : 0
  const tendRecorrencia = calcularTendencia(dados.totalRecorrencia, dados.anterior.totalRecorrencia)

  const itens: { icone: ReactNode; titulo: string; descricao: string }[] = [
    {
      icone: completo ? <IconeApurado className="h-4 w-4" /> : <IconeRelogio className="h-4 w-4" />,
      titulo: `Competência ${NOMES_MESES[mes - 1]}/${ano}`,
      descricao: completo ? 'Processada com sucesso' : 'Apuração em andamento',
    },
    {
      icone: <IconeUsuarios className="h-4 w-4" />,
      titulo: 'Consultores apurados',
      descricao: `${dados.qtdConsultoresApurados} de ${dados.qtdConsultoresAtivos} (${pctApurado}%)`,
    },
    {
      icone: dados.statusContagem.erro === 0 ? <IconeApurado className="h-4 w-4" /> : <IconeAlerta className="h-4 w-4" />,
      titulo: 'Inconsistências',
      descricao: dados.statusContagem.erro === 0 ? 'Nenhuma encontrada' : `${dados.statusContagem.erro} encontrada(s)`,
    },
    {
      icone: <IconeRecorrencia className="h-4 w-4" />,
      titulo: 'Recorrência',
      descricao:
        tendRecorrencia == null
          ? 'Sem histórico para comparar'
          : `${tendRecorrencia >= 0 ? 'Cresceu' : 'Caiu'} ${Math.abs(Math.round(tendRecorrencia))}% vs mês anterior`,
    },
    {
      icone: <IconeRelogio className="h-4 w-4" />,
      titulo: 'Última atualização',
      descricao: dados.ultimaAtualizacao ? formatarUltimaAtualizacao(dados.ultimaAtualizacao) : 'Nenhuma apuração gerada',
    },
  ]

  return (
    // sticky (pedido do Samuel, 04/08/2026: "eu deixaria ela fixa. Sempre.") — vira um rodapé de
    // status sempre visível, como já é o caso na maioria dos dashboards de referência (Stripe,
    // Linear). Conteúdo inalterado por enquanto (ver observação sobre API/Tempo).
    <Cartao className="sticky bottom-0 z-10 p-0 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)]">
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        {itens.map((item) => (
          <div key={item.titulo} className="flex items-start gap-3 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              {item.icone}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{item.titulo}</p>
              <p className="text-xs text-slate-400">{item.descricao}</p>
            </div>
          </div>
        ))}
      </div>
    </Cartao>
  )
}
