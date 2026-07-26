'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Banner } from '@/lib/ui/banner'
import { Botao } from '@/lib/ui/botao'
import { Cartao, CartaoCabecalho } from '@/lib/ui/cartao'
import { consultarStatusPeriodo, revalidarPaineisAposLote, solicitarApuracaoLote, type StatusJob } from './actions'
import { BarraProgresso } from './barra-progresso'
import {
  IconeCamadas,
  IconeCheckCircle,
  IconeRelogio,
  IconeSpinner,
  IconeVelocimetro,
  IconeXCircle,
} from './icones'
import { formatarDuracao, useCronometro } from './usar-cronometro'

interface ConsultorLote {
  cod_consultor: number
  nome: string
  equipe: string
}

type Filtro = 'todos' | 'pendente' | 'processando' | 'concluido' | 'erro'

const hoje = new Date()
const INTERVALO_POLLING_MS = 3000

export function GerarLoteForm({
  consultores,
  anoInicial,
  mesInicial,
}: {
  consultores: ConsultorLote[]
  anoInicial?: number
  mesInicial?: number
}) {
  const [mes, setMes] = useState(mesInicial ?? hoje.getMonth() + 1)
  const [ano, setAno] = useState(anoInicial ?? hoje.getFullYear())
  const [acompanhando, setAcompanhando] = useState(false)
  const [statusPorConsultor, setStatusPorConsultor] = useState<Record<number, StatusJob>>({})
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [erroDisparo, setErroDisparo] = useState<string | null>(null)
  const pararPollingRef = useRef(false)
  const segundos = useCronometro(acompanhando)

  const total = Object.keys(statusPorConsultor).length
  const okCount = Object.values(statusPorConsultor).filter((s) => s.status === 'concluido').length
  const erroCount = Object.values(statusPorConsultor).filter((s) => s.status === 'erro').length
  const processandoCount = Object.values(statusPorConsultor).filter((s) => s.status === 'processando').length
  const pendenteCount = Object.values(statusPorConsultor).filter((s) => s.status === 'pendente').length
  const concluidos = okCount + erroCount
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const falhas = consultores.filter((c) => statusPorConsultor[c.cod_consultor]?.status === 'erro')

  // Velocidade (consultores/min) só faz sentido com progresso real acumulado — evita "Infinity"
  // ou um ETA absurdo nos primeiros segundos, quando `concluidos` ainda é 0 ou 1.
  const velocidadePorMinuto = acompanhando && segundos >= 5 && concluidos > 0 ? concluidos / (segundos / 60) : null
  const restantes = total - concluidos
  const etaSegundos =
    velocidadePorMinuto && velocidadePorMinuto > 0 && restantes > 0
      ? Math.round((restantes / velocidadePorMinuto) * 60)
      : null
  const codConsultorAtual = Object.values(statusPorConsultor).find((s) => s.status === 'processando')?.cod_consultor
  const consultorAtual = codConsultorAtual
    ? (consultores.find((c) => c.cod_consultor === codConsultorAtual)?.nome ?? null)
    : null

  const linhasVisiveis = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return consultores.filter((c) => {
      const s = statusPorConsultor[c.cod_consultor]
      if (!s) return false
      if (filtro !== 'todos' && s.status !== filtro) return false
      if (buscaLower && !c.nome.toLowerCase().includes(buscaLower) && String(c.cod_consultor) !== buscaLower) {
        return false
      }
      return true
    })
  }, [consultores, statusPorConsultor, filtro, busca])

  // Últimos eventos concluídos/com erro, mais recente primeiro — mesmos dados já rastreados em
  // `statusPorConsultor` (nenhuma consulta nova), só reapresentados em ordem cronológica.
  const eventosRecentes = useMemo(() => {
    return Object.values(statusPorConsultor)
      .filter((s) => s.status === 'concluido' || s.status === 'erro')
      .map((s) => ({
        ...s,
        nome: consultores.find((c) => c.cod_consultor === s.cod_consultor)?.nome ?? `Consultor #${s.cod_consultor}`,
      }))
      .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
      .slice(0, 12)
  }, [statusPorConsultor, consultores])

  useEffect(() => {
    return () => {
      pararPollingRef.current = true
    }
  }, [])

  // Retoma o acompanhamento sozinho ao montar (inclusive quando o Gestor navega pra outra tela e
  // volta — o Next.js remonta esse componente do zero, já que /gestor/gerar é uma página própria,
  // não um layout compartilhado). O lote em si continua rodando no Trigger.dev independente disso
  // (fica gravado em `apuracao_jobs`); sem isso, a tela simplesmente esquecia que existia um lote
  // em andamento e voltava a mostrar o botão de disparar do zero, dando a impressão de que tinha
  // sido cancelado.
  useEffect(() => {
    let cancelado = false

    async function retomarSeNecessario() {
      const statusAtual = await consultarStatusPeriodo(ano, mes)
      if (cancelado) return

      const codsDaLista = new Set(consultores.map((c) => c.cod_consultor))
      const relevantes = statusAtual.filter((s) => codsDaLista.has(s.cod_consultor))
      if (relevantes.length === 0) return

      const porConsultor: Record<number, StatusJob> = {}
      for (const s of relevantes) porConsultor[s.cod_consultor] = s
      setStatusPorConsultor((prev) => ({ ...prev, ...porConsultor }))

      const aindaRodando = relevantes.some((s) => s.status === 'pendente' || s.status === 'processando')
      if (aindaRodando) {
        pararPollingRef.current = false
        setAcompanhando(true)
        acompanharAtePronto()
      }
    }

    retomarSeNecessario()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes])

  async function acompanharAtePronto() {
    while (!pararPollingRef.current) {
      const statusAtual = await consultarStatusPeriodo(ano, mes)

      // Só os consultores ATIVOS hoje (`consultores`, a mesma lista que já veio pro formulário) —
      // `consultarStatusPeriodo` devolve TODA linha de apuracao_jobs já criada pra esse ano/mês,
      // inclusive de consultores que ficaram inativos depois que o lote foi disparado (achado
      // real, 26/07/2026: um lote de julho/2026 com 195 consultores ativos mostrava "209" no
      // progresso, porque 14 jobs eram de gente que não está mais ativa hoje). Sem esse filtro, o
      // "X de Y processados" na tela não bate com o "195 consultores ativos" do resto do sistema.
      const codsDaLista = new Set(consultores.map((c) => c.cod_consultor))
      const relevantes = statusAtual.filter((s) => codsDaLista.has(s.cod_consultor))

      const porConsultor: Record<number, StatusJob> = {}
      for (const s of relevantes) porConsultor[s.cod_consultor] = s
      setStatusPorConsultor((prev) => ({ ...prev, ...porConsultor }))

      const todosProntos =
        relevantes.length > 0 && relevantes.every((s) => s.status === 'concluido' || s.status === 'erro')

      if (todosProntos || pararPollingRef.current) break
      await new Promise((r) => setTimeout(r, INTERVALO_POLLING_MS))
    }

    setAcompanhando(false)
    if (!pararPollingRef.current) {
      await revalidarPaineisAposLote()
    }
  }

  async function dispararLista(lista: ConsultorLote[]) {
    if (lista.length === 0) return
    pararPollingRef.current = false
    setAcompanhando(true)
    setFiltro('todos')
    setErroDisparo(null)

    const agora = new Date().toISOString()
    setStatusPorConsultor((prev) => {
      const novo = { ...prev }
      for (const c of lista) {
        novo[c.cod_consultor] = { cod_consultor: c.cod_consultor, status: 'pendente', erro_mensagem: null, atualizado_em: agora }
      }
      return novo
    })

    const resultado = await solicitarApuracaoLote(
      lista.map((c) => ({ codConsultor: c.cod_consultor })),
      ano,
      mes
    )

    if (!resultado.ok) {
      setErroDisparo(resultado.erro ?? 'Erro desconhecido ao disparar o lote.')
      setAcompanhando(false)
      return
    }

    acompanharAtePronto()
  }

  function pararDeAcompanhar() {
    pararPollingRef.current = true
    setAcompanhando(false)
  }

  return (
    <Cartao id="apuracao-em-lote" className="scroll-mt-6 overflow-hidden p-0">
      <div className="border-b border-slate-100 px-6 py-4">
        <CartaoCabecalho
          icone={<IconeCamadas className="h-5 w-5" />}
          titulo="Apuração em lote"
          descricao="Esta ação sincroniza automaticamente todos os consultores ativos com a API do Ileva."
          tom="azul"
        />
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="lote-mes" className="block text-xs font-medium text-slate-500">
              Mês
            </label>
            <input
              id="lote-mes"
              type="number"
              min={1}
              max={12}
              value={mes}
              disabled={acompanhando}
              onChange={(e) => setMes(Number(e.target.value))}
              className="mt-1.5 h-11 w-24 rounded-lg border border-slate-300 px-3.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="lote-ano" className="block text-xs font-medium text-slate-500">
              Ano
            </label>
            <input
              id="lote-ano"
              type="number"
              value={ano}
              disabled={acompanhando}
              onChange={(e) => setAno(Number(e.target.value))}
              className="mt-1.5 h-11 w-28 rounded-lg border border-slate-300 px-3.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-50"
            />
          </div>

          {!acompanhando ? (
            <Botao onClick={() => dispararLista(consultores)} variante="destaque" className="h-11">
              Gerar apuração de todos ({consultores.length})
            </Botao>
          ) : (
            <Botao onClick={pararDeAcompanhar} variante="fantasma" className="h-11">
              Parar de acompanhar
            </Botao>
          )}

          {!acompanhando && falhas.length > 0 && (
            <button
              onClick={() => dispararLista(falhas)}
              className="h-11 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
            >
              Tentar novamente os {falhas.length} que falharam
            </button>
          )}
        </div>

        {erroDisparo ? (
          <Banner tom="erro" className="flex items-start gap-2">
            <IconeXCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erroDisparo}</span>
          </Banner>
        ) : null}

        {total > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold tabular-nums text-brand-navy">{pct}%</span>
                <span className="text-sm text-slate-500">
                  {concluidos} de {total} processados
                </span>
              </div>
              {acompanhando && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <IconeSpinner className="h-3.5 w-3.5" />
                  rodando há {formatarDuracao(segundos)}
                </span>
              )}
            </div>

            <BarraProgresso total={total} ok={okCount} erro={erroCount} emAndamento={acompanhando} />

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {okCount} ok
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {erroCount} erro
              </span>
              {processandoCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> {processandoCount} gerando
                </span>
              )}
              {pendenteCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {pendenteCount} na fila
                </span>
              )}
            </div>

            {acompanhando && (
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                    <IconeVelocimetro className="h-3.5 w-3.5" /> Velocidade
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {velocidadePorMinuto ? `${velocidadePorMinuto.toFixed(1)}/min` : 'calculando...'}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                    <IconeRelogio className="h-3.5 w-3.5" /> Tempo restante
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-700">
                    {etaSegundos != null ? `~${formatarDuracao(etaSegundos)}` : 'calculando...'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                    <IconeSpinner className="h-3.5 w-3.5" /> Processando agora
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{consultorAtual ?? '—'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400">
          A geração roda em segundo plano (Trigger.dev), um consultor por vez — pode fechar esta
          aba que o processamento continua normalmente. Volte aqui depois pra ver o resultado.
        </p>

        {total > 0 && (
          <div className="space-y-3">
            <div className="relative w-full max-w-xs">
              <IconeBusca className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Buscar consultor"
                type="text"
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['todos', `Todos (${total})`],
                  ['concluido', `OK (${okCount})`],
                  ['erro', `Erro (${erroCount})`],
                  ['processando', `Gerando (${processandoCount})`],
                  ['pendente', `Na fila (${pendenteCount})`],
                ] as [Filtro, string][]
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  onClick={() => setFiltro(valor)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filtro === valor
                      ? 'bg-brand-navy text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Consultor</th>
                    <th className="px-4 py-2.5">Equipe</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhasVisiveis.map((c) => (
                    <tr key={c.cod_consultor} className="transition-colors duration-150 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <AvatarLote nome={c.nome} codConsultor={c.cod_consultor} />
                          <span>
                            <span className="text-slate-800">{c.nome}</span>{' '}
                            <span className="text-slate-400">#{c.cod_consultor}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          {c.equipe}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusPorConsultor[c.cod_consultor]} />
                      </td>
                    </tr>
                  ))}
                  {linhasVisiveis.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                        Nenhum consultor nesse status.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div id="historico" className="scroll-mt-6 space-y-3 border-t border-slate-100 pt-5">
          <p className="text-sm font-medium text-slate-700">Histórico desta execução</p>
          {eventosRecentes.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhum evento ainda — assim que a geração começar, cada consultor processado aparece aqui.
            </p>
          ) : (
            <ol className="space-y-3">
              {eventosRecentes.map((evento, i) => (
                <li key={`${evento.cod_consultor}-${evento.atualizado_em}-${i}`} className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      evento.status === 'concluido'
                        ? 'bg-brand-orange/10 text-brand-orange-hover'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {evento.status === 'concluido' ? (
                      <IconeCheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <IconeXCircle className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <p className="text-sm text-slate-600">
                    <span className="font-mono text-xs text-slate-400">{formatarHora(evento.atualizado_em)}</span>{' '}
                    <span className="font-medium text-slate-800">{evento.nome}</span>{' '}
                    {evento.status === 'concluido' ? 'processado com sucesso' : `falhou: ${evento.erro_mensagem}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Cartao>
  )
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Avatar circular com as iniciais do consultor — mesmo padrão visual de TabelaGestor.tsx
// (cor determinística pelo código, só decorativo), duplicado aqui em vez de compartilhado porque
// as duas telas mantêm listas de consultores com formatos ligeiramente diferentes.
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

function AvatarLote({ nome, codConsultor }: { nome: string; codConsultor: number }) {
  const cor = CORES_AVATAR[codConsultor % CORES_AVATAR.length]
  return (
    <span
      aria-hidden
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${cor}`}
    >
      {iniciaisNome(nome)}
    </span>
  )
}

// Badges com as mesmas cores semânticas usadas no resto do sistema (ver CONFIGURACAO_STATUS em
// TabelaGestor.tsx): concluído=verde, processando=azul, pendente=laranja, erro=vermelho.
function StatusBadge({ status }: { status: StatusJob }) {
  if (status.status === 'pendente') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <IconeRelogio className="h-3.5 w-3.5" /> Na fila
      </span>
    )
  }
  if (status.status === 'processando') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
        <IconeSpinner className="h-3.5 w-3.5" /> Gerando...
      </span>
    )
  }
  if (status.status === 'concluido') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-medium text-brand-orange-hover">
        <IconeCheckCircle className="h-3.5 w-3.5" /> Gerado
      </span>
    )
  }
  return (
    <span
      title={status.erro_mensagem ?? undefined}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600"
    >
      <IconeXCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Erro: {status.erro_mensagem}</span>
    </span>
  )
}
