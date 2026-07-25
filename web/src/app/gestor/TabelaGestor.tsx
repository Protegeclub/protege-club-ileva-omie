'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { solicitarApuracao } from './gerar/actions'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { IconeAdesao, IconeRecorrencia, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import type { Consultor } from '@/types/domain'

export interface ApuracaoResumo {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  gerado_em: string
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
  gerado: { label: 'Gerado', classes: 'bg-emerald-50 text-emerald-700', ponto: 'bg-emerald-500' },
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

// null = sem base de comparação (mês anterior zerado ou sem nenhuma apuração) — nesse caso o
// card não mostra tendência nenhuma, pra não inventar um "+100%"/"-100%" sem sentido.
function calcularTendencia(atual: number, anterior: number): number | null {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

// Ícones dos cards de KPI — só usados aqui, por isso ficam locais (mesmo espírito de
// gerar/icones.tsx: SVG à mão, sem depender de lib de ícones).
function IconeCarteira({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9H6.5A2.5 2.5 0 0 1 4 6.5v1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 6.5v10A2.5 2.5 0 0 0 6.5 19h11a2.5 2.5 0 0 0 2.5-2.5V9H16a2 2 0 1 0 0 4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconeApurado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconeSeta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeMais({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  )
}

// Menu "⋮" por linha — Detalhes continua como link principal ao lado; aqui só ficam as ações
// secundárias. "Recalcular" reaproveita a mesma Server Action que a tela /gestor/gerar já usa
// pra disparar uma geração individual no Trigger.dev (não é uma ação nova, só um atalho novo pra
// ela) — depois de disparar, um refresh busca o status atualizado (Pendente/Processando).
function MenuAcoesConsultor({
  codConsultor,
  ano,
  mes,
}: {
  codConsultor: number
  ano: number
  mes: number
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  async function recalcular() {
    setRecalculando(true)
    await solicitarApuracao(codConsultor, ano, mes)
    setRecalculando(false)
    setAberto(false)
    router.refresh()
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Mais ações"
        aria-expanded={aberto}
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <IconeMais className="h-4 w-4" />
      </button>
      {aberto && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <a
            href={`/api/relatorios/consultor?tipo=dashboard&cod_consultor=${codConsultor}&ano=${ano}&mes=${mes}&equipe=0`}
            target="_blank"
            rel="noreferrer"
            className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Baixar PDF
          </a>
          <button
            type="button"
            onClick={recalcular}
            disabled={recalculando}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {recalculando ? 'Solicitando…' : 'Recalcular'}
          </button>
        </div>
      )}
    </div>
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
  const router = useRouter()
  const [equipe, setEquipe] = useState(equipeInicial)
  const [busca, setBusca] = useState(buscaInicial)
  const [sortCampo, setSortCampo] = useState(sortInicial)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(dirInicial)

  const linhas = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
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

  const qsFiltros = new URLSearchParams({
    ano: String(ano),
    mes: String(mes),
    ...(equipe ? { equipe } : {}),
    ...(busca ? { q: busca } : {}),
  }).toString()

  function clicarOrdenar(campo: string, direcaoPadrao: 'asc' | 'desc') {
    if (sortCampo === campo) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCampo(campo)
      setSortDir(direcaoPadrao)
    }
  }

  function indicadorOrdenacao(campo: string) {
    if (sortCampo !== campo) return null
    return sortDir === 'asc' ? '▲' : '▼'
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
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => clicarOrdenar(campo, direcaoPadrao)}
          className="flex items-center gap-1 hover:text-slate-800"
        >
          {label} <span className="text-slate-400">{indicadorOrdenacao(campo)}</span>
        </button>
      </th>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Apuração de Comissões</h1>
          <p className="mt-1 text-sm text-slate-500">{periodoLabel}</p>
          <p className="mt-3 text-xs text-slate-400">
            {ultimaAtualizacao
              ? `Última atualização: ${formatarUltimaAtualizacao(ultimaAtualizacao)}`
              : 'Nenhuma apuração gerada neste período ainda'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Botao type="button" variante="fantasma" className="h-11" onClick={() => router.refresh()}>
            Atualizar
          </Botao>
          <Botao href={`/api/relatorios/gestor/todos?${qsFiltros}`} target="_blank" rel="noreferrer" variante="destaque" className="h-11">
            Gerar PDF
          </Botao>
        </div>
      </div>

      {/* KPIs — refletem os filtros de Equipe/Consultor abaixo (reativo, sem round-trip) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <CardResumo
          icone={<IconeCarteira />}
          titulo="Líquido"
          valor={formatarMoeda(totalLiquidoGeral)}
          tendenciaPct={calcularTendencia(totalLiquidoGeral, totalLiquidoAnterior)}
          valorAnterior={formatarMoeda(totalLiquidoAnterior)}
        />
        <CardResumo
          icone={<IconeAdesao />}
          titulo="Adesão"
          valor={formatarMoeda(totalAdesaoGeral)}
          tendenciaPct={calcularTendencia(totalAdesaoGeral, totalAdesaoAnterior)}
          valorAnterior={formatarMoeda(totalAdesaoAnterior)}
        />
        <CardResumo
          icone={<IconeRecorrencia />}
          titulo="Recorrência"
          valor={formatarMoeda(totalRecorrenciaGeral)}
          tendenciaPct={calcularTendencia(totalRecorrenciaGeral, totalRecorrenciaAnterior)}
          valorAnterior={formatarMoeda(totalRecorrenciaAnterior)}
        />
        <CardResumo icone={<IconeApurado />} titulo="Apurados" valor={String(geradosCount)} />
        <CardResumo icone={<IconeUsuarios />} titulo="Consultores" valor={String(linhas.length)} />
      </div>

      {/* Filtros — pílulas soltas na página (sem card/borda ao redor), sem rótulo flutuando em
          cima de cada campo, pra não parecer formulário de cadastro. Equipe/Consultor filtram na
          hora (client-side); Mês/Ano exigem o "Ver" porque trocam o mês inteiro de apuração
          buscado no servidor (ver comentário mais acima). */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Equipe"
          value={equipe}
          onChange={(e) => setEquipe(e.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Equipe</option>
          {equipesDisponiveis.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>

        <div className="relative w-full max-w-md">
          <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Consultor"
            type="text"
            placeholder="Procurar consultor por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        <div className="h-6 w-px bg-slate-200" aria-hidden />

        <form method="GET" className="flex items-center gap-3">
          <select
            aria-label="Mês"
            name="mes"
            defaultValue={mes}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
            className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <Botao type="submit" variante="secundaria" className="h-11">Aplicar</Botao>
        </form>

        {(equipe || busca || sortCampo) && (
          <Botao type="button" onClick={limparFiltros} variante="fantasma" className="h-11 ml-auto">
            Limpar filtros
          </Botao>
        )}
      </div>

      {/* Tabela — estilo Notion: sem linhas horizontais, só hover, bastante espaço em branco */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">
          Consultores ({linhas.length})
        </h2>

        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-400">
              <tr>
                <ThOrdenavel campo="nome" label="Consultor" direcaoPadrao="asc" />
                <ThOrdenavel campo="equipe" label="Equipe" direcaoPadrao="asc" />
                <ThOrdenavel campo="adesao" label="Adesão" />
                <ThOrdenavel campo="recorrencia" label="Recorrência" />
                <ThOrdenavel campo="desconto" label="Desconto rastreador" />
                <ThOrdenavel campo="liquido" label="Líquido" />
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
          <tbody>
            {linhas.map(({ consultor, apuracao, job }) => {
              const status = calcularStatus(apuracao, job)
              const pctLiquido = apuracao ? Math.max(0, (apuracao.total_liquido / maxLiquido) * 100) : 0
              return (
                <tr
                  key={consultor.cod_consultor}
                  className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 text-slate-800">
                    <Link
                      href={`/gestor/consultor/${consultor.cod_consultor}?${qsAtual}`}
                      className="font-medium hover:underline"
                    >
                      {consultor.nome}
                    </Link>{' '}
                    <span className="text-slate-400">#{consultor.cod_consultor}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{consultor.equipe}</td>
                  <td className="px-4 py-4 text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_adesao) : '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_recorrencia) : '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {apuracao ? formatarMoeda(apuracao.total_desconto_rastreador) : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-base font-semibold text-slate-900">
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
                        <MenuAcoesConsultor codConsultor={consultor.cod_consultor} ano={ano} mes={mes} />
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
                        <MenuAcoesConsultor codConsultor={consultor.cod_consultor} ano={ano} mes={mes} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum consultor encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Estilo "Stripe" — ícone num tile, valor em destaque, rótulo discreto embaixo e, quando dá pra
// comparar com o mês anterior, uma linha de tendência (verde subindo / vermelho descendo).
function CardResumo({
  icone,
  titulo,
  valor,
  tendenciaPct,
  valorAnterior,
}: {
  icone: ReactNode
  titulo: string
  valor: string
  tendenciaPct?: number | null
  valorAnterior?: string
}) {
  const subiu = (tendenciaPct ?? 0) >= 0

  return (
    <Cartao>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy [&>svg]:h-5 [&>svg]:w-5">
        {icone}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-900">{valor}</p>
      <p className="text-sm text-slate-500">{titulo}</p>
      {tendenciaPct != null && (
        <div className="mt-3 text-xs">
          <p className={`font-medium ${subiu ? 'text-emerald-600' : 'text-red-600'}`}>
            {subiu ? '▲' : '▼'} {subiu ? '+' : '-'}
            {Math.abs(Math.round(tendenciaPct))}%
          </p>
          {valorAnterior && (
            <p className="mt-0.5 text-slate-400">Mês anterior: {valorAnterior}</p>
          )}
        </div>
      )}
    </Cartao>
  )
}
