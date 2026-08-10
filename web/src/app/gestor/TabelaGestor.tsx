'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { solicitarApuracao } from './gerar/actions'
import { IconeRelampago } from './gerar/icones'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { CardMetrica, calcularTendencia } from '@/lib/ui/card-metrica'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import {
  IconeAdesao,
  IconeApurado,
  IconeCarteira,
  IconePlaca,
  IconeRecorrencia,
  IconeSeta,
  IconeUsuarios,
} from '@/lib/ui/icones-sidebar'
import type { Consultor } from '@/types/domain'

export interface ApuracaoResumo {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  gerado_em: string
  qtd_placas_ativadas: number
}

// Espelha StatusJob de gestor/gerar/actions.ts (tabela apuracao_jobs) — mesmo dado que a tela de
// "Gerar apuração" já usa pra acompanhar o processamento em segundo plano no Trigger.dev.
export interface JobResumo {
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  erro_mensagem: string | null
}

export interface LinhaGestorProps {
  consultor: Consultor
  apuracao: ApuracaoResumo | null
  // Mesmo mês do ano anterior — só usado pra calcular a tendência dos cards de KPI, nunca
  // exibido nem somado na tabela em si.
  apuracaoAnterior: ApuracaoResumo | null
  job: JobResumo | null
}

type StatusApuracao = 'gerado' | 'pendente' | 'processando' | 'erro'

// "gerado" vem de apuracoes_mensais (fonte da verdade pros números da linha), não do job — um
// job pode ficar com status "concluido" mas o registro em si é o que garante que os valores
// exibidos são reais. Sem nenhum job (nunca solicitado) cai em "pendente", já que também está
// esperando alguém gerar.
function calcularStatus(apuracao: ApuracaoResumo | null, job: JobResumo | null): StatusApuracao {
  if (apuracao) return 'gerado'
  if (job?.status === 'processando') return 'processando'
  if (job?.status === 'erro') return 'erro'
  return 'pendente'
}

const CONFIGURACAO_STATUS: Record<StatusApuracao, { label: string; classes: string; ponto: string }> = {
  gerado: { label: 'Gerado', classes: 'bg-brand-orange/10 text-brand-orange-hover', ponto: 'bg-brand-orange' },
  pendente: { label: 'Pendente', classes: 'bg-amber-50 text-amber-700', ponto: 'bg-amber-500' },
  processando: { label: 'Processando', classes: 'bg-sky-50 text-sky-700', ponto: 'bg-sky-500' },
  erro: { label: 'Erro', classes: 'bg-red-50 text-red-700', ponto: 'bg-red-500' },
}

// Badge estilo HubSpot — fundo bem claro na cor semântica, bolinha + rótulo, nada de texto solto.
function BadgeStatus({ status, titulo }: { status: StatusApuracao; titulo?: string }) {
  const { label, classes, ponto } = CONFIGURACAO_STATUS[status]
  return (
    <span title={titulo} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ponto}`} aria-hidden />
      {label}
    </span>
  )
}

type LinhaGestor = LinhaGestorProps

const COMPARADORES: Record<string, (a: LinhaGestor, b: LinhaGestor) => number> = {
  nome: (a, b) => a.consultor.nome.localeCompare(b.consultor.nome),
  equipe: (a, b) => (a.consultor.equipe || '').localeCompare(b.consultor.equipe || ''),
  adesao: (a, b) => (a.apuracao?.total_adesao ?? 0) - (b.apuracao?.total_adesao ?? 0),
  recorrencia: (a, b) => (a.apuracao?.total_recorrencia ?? 0) - (b.apuracao?.total_recorrencia ?? 0),
  desconto: (a, b) => (a.apuracao?.total_desconto_rastreador ?? 0) - (b.apuracao?.total_desconto_rastreador ?? 0),
  liquido: (a, b) => (a.apuracao?.total_liquido ?? 0) - (b.apuracao?.total_liquido ?? 0),
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconeFiltro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 6h16M7.5 12h9M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconeLimpar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Indicadores de coluna ordenável (padrão datagrid tipo Stripe/Attio): par de chevrons esmaecido
// quando a coluna não é a ordenação ativa; chevron único, sólido e apontando pra direção certa
// quando é (ver ThOrdenavel).
function IconeOrdenacaoNeutra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M7 10l5-5 5 5M7 15l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Avatar circular com as iniciais do consultor — cor escolhida de forma determinística pelo
// código (mesmo consultor sempre cai na mesma cor), só decorativo, sem estado nem dado novo.
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

function AvatarConsultor({ nome, codConsultor }: { nome: string; codConsultor: number }) {
  const cor = CORES_AVATAR[codConsultor % CORES_AVATAR.length]
  return (
    <span
      aria-hidden
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${cor}`}
    >
      {iniciaisNome(nome)}
    </span>
  )
}

// Menu "⋮" por linha — Detalhes continua como link principal ao lado; aqui só ficam as ações
// secundárias. "Recalcular" reaproveita a mesma Server Action que a tela /gestor/gerar já usa
// pra disparar uma geração individual no Trigger.dev (não é uma ação nova, só um atalho novo pra
// ela) — depois de disparar, um refresh busca o status atualizado (Pendente/Processando).
//
// Padrão E (v3): antes era um menu "⋮" com 2 itens (Baixar PDF + Recalcular) — com o PDF
// centralizado em /gestor/relatorios, sobrou 1 ação só, e um dropdown que revela 1 item só é
// camada de interação desnecessária. Virou botão inline, ao lado de "Detalhes"/"Gerar".
function BotaoRecalcular({ codConsultor, ano, mes }: { codConsultor: number; ano: number; mes: number }) {
  const router = useRouter()
  const [recalculando, setRecalculando] = useState(false)

  async function recalcular() {
    setRecalculando(true)
    await solicitarApuracao(codConsultor, ano, mes)
    setRecalculando(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={recalcular}
      disabled={recalculando}
      className="text-sm font-medium text-slate-400 transition-colors hover:text-brand-navy disabled:opacity-50"
    >
      {recalculando ? 'Solicitando…' : 'Recalcular'}
    </button>
  )
}

// "Hoje às 15:34" quando é o mesmo dia; "23/07 às 15:34" caso contrário.
function formatarUltimaAtualizacao(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const mesmoDia = data.toDateString() === hoje.toDateString()
  if (mesmoDia) return `Hoje às ${hora}`
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Filtro (equipe/busca) e ordenação de coluna acontecem 100% no cliente, sobre os dados já
// carregados — sem isso, cada clique disparava uma navegação nova que refazia a busca no Ileva +
// Supabase, o que dava a sensação de "sistema lento" reportada em 18/07/2026 (mesmo depois de
// cachear listarTodosConsultores, um round-trip ao servidor só pra ordenar uma coluna já
// carregada continuava sendo trabalho desnecessário).
export function TabelaGestor({
  linhasIniciais,
  equipesDisponiveis,
  ano,
  mes,
  qsAtual,
  equipeInicial,
  buscaInicial,
  sortInicial,
  dirInicial,
  periodoLabel,
  ultimaAtualizacao,
}: {
  linhasIniciais: LinhaGestorProps[]
  equipesDisponiveis: string[]
  ano: number
  mes: number
  qsAtual: string
  equipeInicial: string
  buscaInicial: string
  sortInicial: string
  dirInicial: 'asc' | 'desc'
  periodoLabel: string
  ultimaAtualizacao: string | null
}) {
  const [equipe, setEquipe] = useState(equipeInicial)
  const [busca, setBusca] = useState(buscaInicial)
  const [sortCampo, setSortCampo] = useState(sortInicial)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(dirInicial)

  const linhas = useMemo(() => {
    // Remove um "#" na frente antes de comparar — os códigos aparecem como "#123" em toda a
    // tela (ex.: linha 578 abaixo), então buscar "#123" é o comportamento esperado de quem só
    // copiou o que já vê na tela, não "123" sem o prefixo.
    const buscaLower = busca.trim().toLowerCase().replace(/^#/, '')
    return linhasIniciais
      .filter((l) => !equipe || l.consultor.equipe === equipe)
      .filter(
        (l) =>
          !buscaLower ||
          l.consultor.nome.toLowerCase().includes(buscaLower) ||
          String(l.consultor.cod_consultor) === buscaLower
      )
      .sort((a, b) => {
        if (sortCampo && COMPARADORES[sortCampo]) {
          const resultado = COMPARADORES[sortCampo](a, b)
          return sortDir === 'asc' ? resultado : -resultado
        }
        if (a.apuracao && !b.apuracao) return -1
        if (!a.apuracao && b.apuracao) return 1
        if (a.apuracao && b.apuracao) return b.apuracao.total_liquido - a.apuracao.total_liquido
        return a.consultor.nome.localeCompare(b.consultor.nome)
      })
  }, [linhasIniciais, equipe, busca, sortCampo, sortDir])

  const totalLiquidoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_liquido ?? 0), 0)
  const totalAdesaoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_adesao ?? 0), 0)
  const totalRecorrenciaGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_recorrencia ?? 0), 0)
  const totalPlacasAtivadasGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.qtd_placas_ativadas ?? 0), 0)
  const geradosCount = linhas.filter((l) => l.apuracao).length

  // Maior líquido do conjunto filtrado — só pra escalar a barrinha proporcional da coluna
  // Líquido (mínimo 1 pra nunca dividir por zero quando ninguém tem apuração ainda).
  const maxLiquido = Math.max(1, ...linhas.map((l) => l.apuracao?.total_liquido ?? 0))

  // Mesmos totais, mas do mês anterior — só pra tendência dos cards (ver calcularTendencia).
  // Somado sobre o mesmo conjunto filtrado (linhas), pra comparação fazer sentido quando um
  // filtro de Equipe/Consultor está ativo.
  const totalLiquidoAnterior = linhas.reduce((soma, l) => soma + (l.apuracaoAnterior?.total_liquido ?? 0), 0)
  const totalAdesaoAnterior = linhas.reduce((soma, l) => soma + (l.apuracaoAnterior?.total_adesao ?? 0), 0)
  const totalRecorrenciaAnterior = linhas.reduce((soma, l) => soma + (l.apuracaoAnterior?.total_recorrencia ?? 0), 0)
  const totalPlacasAtivadasAnterior = linhas.reduce((soma, l) => soma + (l.apuracaoAnterior?.qtd_placas_ativadas ?? 0), 0)

  function clicarOrdenar(campo: string, direcaoPadrao: 'asc' | 'desc') {
    if (sortCampo === campo) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCampo(campo)
      setSortDir(direcaoPadrao)
    }
  }

  function limparFiltros() {
    setEquipe('')
    setBusca('')
    setSortCampo('')
    setSortDir('desc')
  }

  function ThOrdenavel({
    campo,
    label,
    direcaoPadrao = 'desc',
  }: {
    campo: string
    label: string
    direcaoPadrao?: 'asc' | 'desc'
  }) {
    const ativo = sortCampo === campo
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => clicarOrdenar(campo, direcaoPadrao)}
          className="flex items-center gap-1 hover:text-slate-700"
        >
          {label}
          {ativo ? (
            <IconeChevron
              className={`h-3.5 w-3.5 text-brand-navy transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
            />
          ) : (
            <IconeOrdenacaoNeutra className="h-3 w-3 text-slate-300" />
          )}
        </button>
      </th>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Apuração de Comissões</h1>
          <p className="mt-1 text-sm text-slate-500">{periodoLabel}</p>
          <p className="mt-3 text-xs text-slate-400">
            {ultimaAtualizacao
              ? `Última atualização: ${formatarUltimaAtualizacao(ultimaAtualizacao)}`
              : 'Nenhuma apuração gerada neste período ainda'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Botao href="/gestor/gerar" variante="destaque" className="h-11">
            <IconeRelampago className="h-4 w-4" />
            Gerar apuração
          </Botao>
        </div>
      </div>

      {/* KPIs — refletem os filtros de Equipe/Consultor abaixo (reativo, sem round-trip). Cada
          card tem uma cor de apoio diferente (mesmo espírito "dashboard executivo" do print de
          referência do Samuel, 26/07/2026) — só decorativo, não codifica nenhum significado além
          de diferenciar os cards visualmente. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <CardMetrica
          icone={<IconeCarteira />}
          cor="blue"
          titulo="Líquido"
          valor={formatarMoeda(totalLiquidoGeral)}
          tendenciaPct={calcularTendencia(totalLiquidoGeral, totalLiquidoAnterior)}
          valorAnterior={formatarMoeda(totalLiquidoAnterior)}
          sparkline={[totalLiquidoAnterior, totalLiquidoGeral]}
        />
        <CardMetrica
          icone={<IconeAdesao />}
          cor="orange"
          titulo="Adesão"
          valor={formatarMoeda(totalAdesaoGeral)}
          tendenciaPct={calcularTendencia(totalAdesaoGeral, totalAdesaoAnterior)}
          valorAnterior={formatarMoeda(totalAdesaoAnterior)}
          sparkline={[totalAdesaoAnterior, totalAdesaoGeral]}
        />
        <CardMetrica
          icone={<IconeRecorrencia />}
          cor="blue"
          titulo="Recorrência"
          valor={formatarMoeda(totalRecorrenciaGeral)}
          tendenciaPct={calcularTendencia(totalRecorrenciaGeral, totalRecorrenciaAnterior)}
          valorAnterior={formatarMoeda(totalRecorrenciaAnterior)}
          sparkline={[totalRecorrenciaAnterior, totalRecorrenciaGeral]}
        />
        <CardMetrica
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas"
          valor={String(totalPlacasAtivadasGeral)}
          descricao="Este mês"
          sparkline={[totalPlacasAtivadasAnterior, totalPlacasAtivadasGeral]}
        />
        <CardMetrica
          icone={<IconeApurado />}
          cor="navy"
          titulo="Apurados"
          valor={String(geradosCount)}
          descricao="Consultores apurados"
          anelProgresso={{ atual: geradosCount, total: linhas.length }}
        />
        <CardMetrica
          icone={<IconeUsuarios />}
          cor="navy"
          titulo="Consultores"
          valor={String(linhas.length)}
          descricao="Total de consultores"
        />
      </div>

      {/* Filtros — Equipe/Consultor filtram na hora (client-side); Mês/Ano exigem "Aplicar
          filtros" porque trocam o mês inteiro de apuração buscado no servidor (ver comentário
          mais acima). */}
      <Cartao className="flex flex-wrap items-center gap-3 p-4">
        <select
          aria-label="Equipe"
          value={equipe}
          onChange={(e) => setEquipe(e.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
        >
          <option value="">Todas as equipes</option>
          {equipesDisponiveis.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>

        <div className="relative w-full max-w-md">
          <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Consultor"
            type="text"
            placeholder="Buscar consultor por nome ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
          />
        </div>

        <div className="h-6 w-px bg-slate-200" aria-hidden />

        <form method="GET" className="flex items-center gap-3">
          <select
            aria-label="Mês"
            name="mes"
            defaultValue={mes}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
          >
            {NOMES_MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>{nome}</option>
            ))}
          </select>
          <input
            aria-label="Ano"
            name="ano"
            type="number"
            defaultValue={ano}
            className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
          />
          <Botao type="submit" variante="primaria" className="h-11">
            <IconeFiltro className="h-4 w-4" />
            Aplicar filtros
          </Botao>
        </form>

        {(equipe || busca || sortCampo) && (
          <button
            type="button"
            onClick={limparFiltros}
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <IconeLimpar className="h-4 w-4" />
            Limpar filtros
          </button>
        )}
      </Cartao>

      {/* Tabela — datagrid: divisórias finas entre linhas, cabeçalho com fundo sutil, painel com
          borda + sombra leve (mesmo tratamento de "cartão elevado" do resto da tela). */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">
          Consultores ({linhas.length})
        </h2>

        <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <ThOrdenavel campo="nome" label="Consultor" direcaoPadrao="asc" />
                <ThOrdenavel campo="equipe" label="Equipe" direcaoPadrao="asc" />
                <ThOrdenavel campo="adesao" label="Adesão" />
                <ThOrdenavel campo="recorrencia" label="Recorrência" />
                <ThOrdenavel campo="desconto" label="Desconto rastreador" />
                <ThOrdenavel campo="liquido" label="Líquido" />
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map(({ consultor, apuracao, job }) => {
              const status = calcularStatus(apuracao, job)
              const pctLiquido = apuracao ? Math.max(0, (apuracao.total_liquido / maxLiquido) * 100) : 0
              return (
                <tr
                  key={consultor.cod_consultor}
                  className="group transition-colors duration-150 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 text-slate-800">
                    <div className="flex items-center gap-3">
                      <AvatarConsultor nome={consultor.nome} codConsultor={consultor.cod_consultor} />
                      <div>
                        <Link
                          href={`/gestor/consultor/${consultor.cod_consultor}?${qsAtual}`}
                          className="font-medium hover:underline"
                        >
                          {consultor.nome}
                        </Link>{' '}
                        <span className="text-slate-400">#{consultor.cod_consultor}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{consultor.equipe}</td>
                  <td className="px-4 py-4 tabular-nums text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_adesao) : '—'}
                  </td>
                  <td className="px-4 py-4 tabular-nums text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_recorrencia) : '—'}
                  </td>
                  <td className="px-4 py-4 tabular-nums text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_desconto_rastreador) : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-base font-semibold tabular-nums text-slate-900">
                      {apuracao ? formatarMoeda(apuracao.total_liquido) : '—'}
                    </p>
                    {apuracao && (
                      <div className="mt-1.5 h-1 w-20 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-navy"
                          style={{ width: `${pctLiquido}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <BadgeStatus status={status} titulo={status === 'erro' ? (job?.erro_mensagem ?? undefined) : undefined} />
                  </td>
                  <td className="px-4 py-4">
                    {apuracao ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/gestor/consultor/${consultor.cod_consultor}?${qsAtual}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
                        >
                          Detalhes
                          <IconeSeta className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <BotaoRecalcular codConsultor={consultor.cod_consultor} ano={ano} mes={mes} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link
                          href="/gestor/gerar"
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
                        >
                          Gerar
                          <IconeSeta className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <BotaoRecalcular codConsultor={consultor.cod_consultor} ano={ano} mes={mes} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {linhas.length === 0 && (
              <LinhaVazia colSpan={8} texto="Nenhum consultor encontrado com os filtros atuais." />
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

