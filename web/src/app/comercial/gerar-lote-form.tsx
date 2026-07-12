'use client'

import { useRef, useState } from 'react'
import { gerarApuracaoUmConsultor, revalidarPaineisAposLote } from './actions'

interface ConsultorLote {
  cod_consultor: number
  nome: string
  equipe: string
}

type StatusConsultor = 'pendente' | 'gerando' | 'ok' | 'erro'

interface ResultadoConsultor {
  status: StatusConsultor
  mensagem?: string
  totalLiquido?: number
}

const hoje = new Date()

// Concorrência limitada no client (não uma Server Action só rodando todo mundo) — ver comentário
// em web/src/app/comercial/actions.ts sobre por quê. 3 de cada vez é o mesmo patamar usado
// internamente por consultor (ver comConcorrenciaLimitada em lib/apuracao/mensal.ts).
const CONCORRENCIA = 3

export function GerarLoteForm({ consultores }: { consultores: ConsultorLote[] }) {
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [rodando, setRodando] = useState(false)
  const [resultados, setResultados] = useState<Record<number, ResultadoConsultor>>({})
  const canceladoRef = useRef(false)

  const total = Object.keys(resultados).length
  const concluidos = Object.values(resultados).filter((r) => r.status === 'ok' || r.status === 'erro').length
  const okCount = Object.values(resultados).filter((r) => r.status === 'ok').length
  const falhas = consultores.filter((c) => resultados[c.cod_consultor]?.status === 'erro')

  async function rodarLista(lista: ConsultorLote[]) {
    if (lista.length === 0) return
    setRodando(true)
    canceladoRef.current = false

    setResultados((prev) => {
      const novo = { ...prev }
      for (const c of lista) novo[c.cod_consultor] = { status: 'pendente' }
      return novo
    })

    const fila = [...lista]

    async function processarProximo(): Promise<void> {
      if (canceladoRef.current) return
      const consultor = fila.shift()
      if (!consultor) return

      setResultados((prev) => ({ ...prev, [consultor.cod_consultor]: { status: 'gerando' } }))

      const resultado = await gerarApuracaoUmConsultor(consultor.cod_consultor, ano, mes)

      setResultados((prev) => ({
        ...prev,
        [consultor.cod_consultor]: resultado.ok
          ? { status: 'ok', totalLiquido: resultado.totalLiquido }
          : { status: 'erro', mensagem: resultado.erro ?? 'Erro desconhecido.' },
      }))

      await processarProximo()
    }

    const trabalhadores = Math.min(CONCORRENCIA, lista.length)
    await Promise.all(Array.from({ length: trabalhadores }, () => processarProximo()))

    setRodando(false)
    if (!canceladoRef.current) {
      await revalidarPaineisAposLote()
    }
  }

  function cancelar() {
    canceladoRef.current = true
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
            disabled={rodando}
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
            disabled={rodando}
            onChange={(e) => setAno(Number(e.target.value))}
            className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>

        {!rodando ? (
          <button
            onClick={() => rodarLista(consultores)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Gerar apuração de todos ({consultores.length} consultores)
          </button>
        ) : (
          <button
            onClick={cancelar}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Cancelar
          </button>
        )}

        {!rodando && falhas.length > 0 && (
          <button
            onClick={() => rodarLista(falhas)}
            className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Tentar novamente os {falhas.length} que falharam
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="text-sm text-slate-600">
          {concluidos} / {total} concluído(s) — {okCount} ok, {falhas.length} com erro
          {rodando ? ' · rodando, não feche esta aba...' : ''}
        </div>
      )}

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
                .filter((c) => resultados[c.cod_consultor])
                .map((c) => (
                  <tr key={c.cod_consultor} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">
                      {c.nome} <span className="text-slate-400">#{c.cod_consultor}</span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{c.equipe}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge resultado={resultados[c.cod_consultor]} />
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

function StatusBadge({ resultado }: { resultado: ResultadoConsultor }) {
  if (resultado.status === 'pendente') return <span className="text-slate-400">Pendente</span>
  if (resultado.status === 'gerando') return <span className="text-amber-600">Gerando...</span>
  if (resultado.status === 'ok') {
    return (
      <span className="text-emerald-700">
        OK — R$ {resultado.totalLiquido?.toFixed(2)}
      </span>
    )
  }
  return <span className="text-red-600">Erro: {resultado.mensagem}</span>
}
