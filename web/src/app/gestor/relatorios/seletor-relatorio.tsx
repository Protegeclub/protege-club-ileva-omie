'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

interface ConsultorOpcao {
  cod_consultor: number
  nome: string
  equipe: string
}

type Modo = 'todos' | 'equipe' | 'consultor'
type Formato = 'detalhado' | 'resumo'
type TipoConsultor = 'dashboard' | 'adesoes' | 'recorrencia' | 'rastreadores' | 'placas-ativadas' | 'inadimplentes'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const TIPOS_CONSULTOR: { valor: TipoConsultor; label: string }[] = [
  { valor: 'dashboard', label: 'Dashboard completo' },
  { valor: 'adesoes', label: 'Adesões' },
  { valor: 'recorrencia', label: 'Recorrência' },
  { valor: 'rastreadores', label: 'Descontos de rastreadores' },
  { valor: 'placas-ativadas', label: 'Placas ativadas' },
  { valor: 'inadimplentes', label: 'Inadimplentes' },
]

// Lê o estado inicial direto de window.location — não usar useSearchParams() +
// router.replace() aqui, porque no App Router qualquer navegação (mesmo só trocando
// searchParams) reexecuta o Server Component da página no servidor. Essa tela não tem nada
// server-side que dependa do filtro (a lista de consultores/equipes já vem pronta por prop), então
// sincronizar a URL a cada clique de filtro pagaria um round-trip à toa a cada interação — o
// mesmo problema de "sensação de sistema lento" já resolvido em TabelaGestor (filtro 100%
// client-side). Por isso a sincronização de URL aqui usa history.replaceState puro: o link fica
// copiável/compartilhável, sem custo de rede por clique.
function lerParamsIniciais() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export function SeletorRelatorio({
  consultores,
  equipesDisponiveis,
  anoInicial,
  mesInicial,
  dataInicioPadrao,
  dataFimPadrao,
}: {
  consultores: ConsultorOpcao[]
  equipesDisponiveis: string[]
  anoInicial: number
  mesInicial: number
  dataInicioPadrao: string
  dataFimPadrao: string
}) {
  // Só usado dentro dos inicializadores de useState abaixo (lidos uma única vez, no mount) —
  // não precisa de useRef/useMemo pra "congelar" o valor entre renders.
  const paramsIniciais = lerParamsIniciais()

  const [modo, setModo] = useState<Modo>((paramsIniciais.get('modo') as Modo) || 'todos')
  const [formato, setFormato] = useState<Formato>((paramsIniciais.get('formato') as Formato) || 'detalhado')
  const [equipe, setEquipe] = useState(paramsIniciais.get('equipe') || '')
  const [ano, setAno] = useState(Number(paramsIniciais.get('ano')) || anoInicial)
  const [mes, setMes] = useState(Number(paramsIniciais.get('mes')) || mesInicial)
  const [dataInicio, setDataInicio] = useState(paramsIniciais.get('data_inicio') || dataInicioPadrao)
  const [dataFim, setDataFim] = useState(paramsIniciais.get('data_fim') || dataFimPadrao)
  const [codConsultor, setCodConsultor] = useState<number | null>(
    Number(paramsIniciais.get('cod_consultor')) || null
  )
  const [tipoConsultor, setTipoConsultor] = useState<TipoConsultor>(
    (paramsIniciais.get('tipo') as TipoConsultor) || 'dashboard'
  )
  const [equipeToda, setEquipeToda] = useState(paramsIniciais.get('equipeToda') === '1')
  const [buscaConsultor, setBuscaConsultor] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [solicitado, setSolicitado] = useState(false)
  const buscaRef = useRef<HTMLDivElement>(null)

  const consultorSelecionado = consultores.find((c) => c.cod_consultor === codConsultor) ?? null

  // modo=equipe reaproveita o MESMO bloco de campos de "todos" (formato/período) — a única
  // diferença real é o parâmetro &equipe=X no link final.
  const equipeParaLink = modo === 'equipe' ? equipe : ''

  // Sincroniza a URL visível (sem navegar/refetch — ver comentário de lerParamsIniciais).
  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('modo', modo)
    if (modo === 'todos' || modo === 'equipe') {
      qs.set('formato', formato)
      if (modo === 'equipe' && equipe) qs.set('equipe', equipe)
      if (formato === 'detalhado') {
        qs.set('ano', String(ano))
        qs.set('mes', String(mes))
      } else {
        qs.set('data_inicio', dataInicio)
        qs.set('data_fim', dataFim)
      }
    } else {
      if (codConsultor) qs.set('cod_consultor', String(codConsultor))
      qs.set('tipo', tipoConsultor)
      if (tipoConsultor !== 'inadimplentes') {
        qs.set('ano', String(ano))
        qs.set('mes', String(mes))
        qs.set('equipeToda', equipeToda ? '1' : '0')
      }
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${qs.toString()}`)
  }, [modo, formato, equipe, ano, mes, dataInicio, dataFim, codConsultor, tipoConsultor, equipeToda])

  useEffect(() => {
    if (!buscaAberta) return
    function aoClicarFora(e: MouseEvent) {
      if (buscaRef.current && !buscaRef.current.contains(e.target as Node)) setBuscaAberta(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [buscaAberta])

  useEffect(() => {
    if (!solicitado) return
    const t = setTimeout(() => setSolicitado(false), 4000)
    return () => clearTimeout(t)
  }, [solicitado])

  const resultadosBusca = useMemo(() => {
    const termo = buscaConsultor.trim().toLowerCase().replace(/^#/, '')
    if (!termo) return []
    return consultores
      .filter((c) => c.nome.toLowerCase().includes(termo) || String(c.cod_consultor) === termo)
      .slice(0, 8)
  }, [consultores, buscaConsultor])

  const periodoLabel = `${NOMES_MESES[mes - 1]}/${ano}`

  const { href, rotulo, motivoDesabilitado } = useMemo(() => {
    if (modo === 'consultor') {
      if (!consultorSelecionado) return { href: null, rotulo: 'Baixar PDF', motivoDesabilitado: 'Escolha um consultor.' }
      const params = new URLSearchParams({ tipo: tipoConsultor, cod_consultor: String(codConsultor) })
      if (tipoConsultor !== 'inadimplentes') {
        params.set('ano', String(ano))
        params.set('mes', String(mes))
        params.set('equipe', equipeToda ? '1' : '0')
      }
      const tipoLabel = TIPOS_CONSULTOR.find((t) => t.valor === tipoConsultor)?.label ?? ''
      const sufixoPeriodo = tipoConsultor === 'inadimplentes' ? '' : ` — ${periodoLabel}`
      return {
        href: `/api/relatorios/consultor?${params.toString()}`,
        rotulo: `Baixar PDF — ${tipoLabel} — ${consultorSelecionado.nome}${sufixoPeriodo}`,
        motivoDesabilitado: null,
      }
    }

    if (modo === 'equipe' && !equipe) {
      return { href: null, rotulo: 'Baixar PDF', motivoDesabilitado: 'Escolha uma equipe.' }
    }

    const sufixoEquipe = modo === 'equipe' ? ` — Equipe ${equipe}` : ''
    if (formato === 'detalhado') {
      const params = new URLSearchParams({ ano: String(ano), mes: String(mes) })
      if (equipeParaLink) params.set('equipe', equipeParaLink)
      return {
        href: `/api/relatorios/gestor/todos?${params.toString()}`,
        rotulo: `Baixar PDF — Detalhado${sufixoEquipe} — ${periodoLabel}`,
        motivoDesabilitado: null,
      }
    }

    if (!dataInicio || !dataFim) {
      return { href: null, rotulo: 'Baixar PDF', motivoDesabilitado: 'Escolha o período.' }
    }
    const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim })
    if (equipeParaLink) params.set('equipe', equipeParaLink)
    return {
      href: `/api/relatorios/consolidado?${params.toString()}`,
      rotulo: `Baixar PDF — Resumo${sufixoEquipe}`,
      motivoDesabilitado: null,
    }
  }, [modo, formato, equipe, equipeParaLink, ano, mes, dataInicio, dataFim, codConsultor, consultorSelecionado, tipoConsultor, equipeToda, periodoLabel])

  return (
    <div className="max-w-3xl space-y-6">
      {/* Padrão F (barra de opções) — segmented control de 3 alvos grandes, não dropdown. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            { valor: 'todos' as const, titulo: 'Todos os consultores', descricao: 'Separado por equipe' },
            { valor: 'equipe' as const, titulo: 'Equipe específica', descricao: 'Escolha uma equipe' },
            { valor: 'consultor' as const, titulo: 'Consultor específico', descricao: 'Escolha uma pessoa' },
          ]
        ).map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => setModo(opcao.valor)}
            aria-pressed={modo === opcao.valor}
            className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
              modo === opcao.valor
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-blue/40 hover:bg-sky-50'
            }`}
          >
            <p className="font-semibold">{opcao.titulo}</p>
            <p className={`mt-0.5 text-xs ${modo === opcao.valor ? 'text-white/70' : 'text-slate-400'}`}>
              {opcao.descricao}
            </p>
          </button>
        ))}
      </div>

      <Cartao className="space-y-4 p-5">
        {modo === 'equipe' && (
          <div>
            <label htmlFor="equipe" className="block text-xs font-medium text-slate-500">
              Equipe
            </label>
            <select
              id="equipe"
              value={equipe}
              onChange={(e) => setEquipe(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue sm:w-64"
            >
              <option value="">Selecione uma equipe…</option>
              {equipesDisponiveis.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        )}

        {modo === 'consultor' && (
          <div ref={buscaRef} className="relative">
            <label htmlFor="busca-consultor" className="block text-xs font-medium text-slate-500">
              Consultor
            </label>
            <div className="relative mt-1">
              <IconeBusca className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="busca-consultor"
                type="text"
                value={consultorSelecionado ? `${consultorSelecionado.nome} #${consultorSelecionado.cod_consultor}` : buscaConsultor}
                onChange={(e) => {
                  setCodConsultor(null)
                  setBuscaConsultor(e.target.value)
                  setBuscaAberta(true)
                }}
                onFocus={() => setBuscaAberta(true)}
                placeholder="Buscar por nome ou código…"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
              />
            </div>
            {buscaAberta && resultadosBusca.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {resultadosBusca.map((c) => (
                  <button
                    key={c.cod_consultor}
                    type="button"
                    onClick={() => {
                      setCodConsultor(c.cod_consultor)
                      setBuscaConsultor('')
                      setBuscaAberta(false)
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {c.nome} <span className="text-slate-400">#{c.cod_consultor} · {c.equipe}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="tipo-consultor" className="block text-xs font-medium text-slate-500">
                Tipo de relatório
              </label>
              <select
                id="tipo-consultor"
                value={tipoConsultor}
                onChange={(e) => setTipoConsultor(e.target.value as TipoConsultor)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue sm:w-64"
              >
                {TIPOS_CONSULTOR.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.label}</option>
                ))}
              </select>
            </div>

            {tipoConsultor !== 'inadimplentes' && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={equipeToda}
                  onChange={(e) => setEquipeToda(e.target.checked)}
                  className="rounded border-slate-300 text-brand-navy focus-visible:ring-brand-blue"
                />
                Incluir lançamentos de toda a equipe
              </label>
            )}
          </div>
        )}

        {(modo === 'todos' || modo === 'equipe') && (
          <div className="flex flex-wrap items-center gap-2">
            {(['detalhado', 'resumo'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormato(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  formato === f ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'detalhado' ? 'Detalhado (por consultor)' : 'Resumo (por período)'}
              </button>
            ))}
          </div>
        )}

        {((modo === 'todos' || modo === 'equipe') && formato === 'detalhado') ||
        (modo === 'consultor' && tipoConsultor !== 'inadimplentes') ? (
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="mes" className="block text-xs font-medium text-slate-500">Mês</label>
              <select
                id="mes"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
              >
                {NOMES_MESES.map((nome, i) => (
                  <option key={nome} value={i + 1}>{nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ano" className="block text-xs font-medium text-slate-500">Ano</label>
              <input
                id="ano"
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
              />
            </div>
          </div>
        ) : null}

        {(modo === 'todos' || modo === 'equipe') && formato === 'resumo' && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="data_inicio" className="block text-xs font-medium text-slate-500">Data inicial</label>
              <input
                id="data_inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
              />
            </div>
            <div>
              <label htmlFor="data_fim" className="block text-xs font-medium text-slate-500">Data final</label>
              <input
                id="data_fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
              />
            </div>
          </div>
        )}
      </Cartao>

      <div>
        {href ? (
          <Botao
            href={href}
            target="_blank"
            rel="noreferrer"
            variante="destaque"
            onClick={() => setSolicitado(true)}
          >
            {rotulo}
          </Botao>
        ) : (
          <Botao disabled variante="destaque">
            {rotulo}
          </Botao>
        )}
        {motivoDesabilitado && !href && <p className="mt-1.5 text-xs text-slate-400">{motivoDesabilitado}</p>}
        {solicitado && (
          <p className="mt-1.5 text-xs text-emerald-600" aria-live="polite">
            Relatório solicitado — confira a nova guia aberta.
          </p>
        )}
      </div>
    </div>
  )
}
