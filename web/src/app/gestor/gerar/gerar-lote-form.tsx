'use client'

import { useEffect, useRef, useState } from 'react'
import { consultarStatusPeriodo, revalidarPaineisAposLote, solicitarApuracao, type StatusJob } from './actions'

interface ConsultorLote {
  cod_consultor: number
  nome: string
  equipe: string
}

const hoje = new Date()
const INTERVALO_POLLING_MS = 4000
// Só dispara os pedidos (inserir + acionar a tarefa) em paralelo — é rápido, não é o cálculo em
// si. O cálculo de verdade roda no Trigger.dev com concorrência 1 (ver
// web/src/trigger/gerar-apuracao.ts), então o "acompanhar" é só consulta de status.
const CONCORRENCIA_DISPARO = 10

export function GerarLoteForm({ consultores }: { consultores: ConsultorLote[] }) {
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [acompanhando, setAcompanhando] = useState(false)
  const [statusPorConsultor, setStatusPorConsultor] = useState<Record<number, StatusJob>>({})
  const pararPollingRef = useRef(false)

  const total = Object.keys(statusPorConsultor).length
  const concluidos = Object.values(statusPorConsultor).filter(
    (s) => s.status === 'concluido' || s.status === 'erro'
  ).length
  const okCount = Object.values(statusPorConsultor).filter((s) => s.status === 'concluido').length
  const falhas = consultores.filter((c) => statusPorConsultor[c.cod_consultor]?.status === 'erro')

  useEffect(() => {
    return () => {
      pararPollingRef.current = true
    }
  }, [])

  async function acompanharAtePronto() {
    while (!pararPollingRef.current) {
      const statusAtual = await consultarStatusPeriodo(ano, mes)
      const porConsultor: Record<number, StatusJob> = {}
      for (const s of statusAtual) porConsultor[s.cod_consultor] = s
      setStatusPorConsultor((prev) => ({ ...prev, ...porConsultor }))

      const codsDaLista = new Set(consultores.map((c) => c.cod_consultor))
      const relevantes = statusAtual.filter((s) => codsDaLista.has(s.cod_consultor))
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

    setStatusPorConsultor((prev) => {
      const novo = { ...prev }
      for (const c of lista) novo[c.cod_consultor] = { cod_consultor: c.cod_consultor, status: 'pendente', erro_mensagem: null }
      return novo
    })

    const fila = [...lista]
    async function dispararProximo(): Promise<void> {
      const consultor = fila.shift()
      if (!consultor) return
      await solicitarApuracao(consultor.cod_consultor, ano, mes)
      await dispararProximo()
    }
    const disparadores = Math.min(CONCORRENCIA_DISPARO, lista.length)
    await Promise.all(Array.from({ length: disparadores }, () => dispararProximo()))

    acompanharAtePronto()
  }

  function pararDeAcompanhar() {
    pararPollingRef.current = true
    setAcompanhando(false)
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="lote-mes" className="block text-sm font-medium text-slate-700">
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
            className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
        <div>
          <label htmlFor="lote-ano" className="block text-sm font-medium text-slate-700">
            Ano
          </label>
          <input
            id="lote-ano"
            type="number"
            value={ano}
            disabled={acompanhando}
            onChange={(e) => setAno(Number(e.target.value))}
            className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>

        {!acompanhando ? (
          <button
            onClick={() => dispararLista(consultores)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Gerar apuração de todos ({consultores.length} consultores)
          </button>
        ) : (
          <button
            onClick={pararDeAcompanhar}
            className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Parar de acompanhar (continua rodando em segundo plano)
          </button>
        )}

        {!acompanhando && falhas.length > 0 && (
          <button
            onClick={() => dispararLista(falhas)}
            className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Tentar novamente os {falhas.length} que falharam
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="text-sm text-slate-600">
          {concluidos} / {total} concluído(s) — {okCount} ok, {falhas.length} com erro
          {acompanhando ? ' · processando em segundo plano...' : ''}
        </div>
      )}

      <p className="text-xs text-slate-400">
        A geração roda em segundo plano (Trigger.dev), um consultor por vez — pode fechar esta aba
        que o processamento continua normalmente. Volte aqui depois pra ver o resultado.
      </p>

      {total > 0 && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Consultor</th>
                <th className="px-3 py-1.5 font-medium">Equipe</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {consultores
                .filter((c) => statusPorConsultor[c.cod_consultor])
                .map((c) => (
                  <tr key={c.cod_consultor} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">
                      {c.nome} <span className="text-slate-400">#{c.cod_consultor}</span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{c.equipe}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={statusPorConsultor[c.cod_consultor]} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: StatusJob }) {
  if (status.status === 'pendente') return <span className="text-slate-400">Na fila</span>
  if (status.status === 'processando') return <span className="text-amber-600">Gerando...</span>
  if (status.status === 'concluido') return <span className="text-emerald-700">OK</span>
  return <span className="text-red-600">Erro: {status.erro_mensagem}</span>
}
