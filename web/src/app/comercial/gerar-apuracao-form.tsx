'use client'

import { useRef, useState } from 'react'
import { consultarStatusPeriodo, solicitarApuracao, type StatusJob } from './actions'

const hoje = new Date()
const INTERVALO_POLLING_MS = 3000

export function GerarApuracaoForm() {
  const [codConsultor, setCodConsultor] = useState('')
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [acompanhando, setAcompanhando] = useState(false)
  const [status, setStatus] = useState<StatusJob | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const pararRef = useRef(false)

  async function acompanhar(cod: number, anoAlvo: number, mesAlvo: number) {
    pararRef.current = false
    while (!pararRef.current) {
      const statusAtual = await consultarStatusPeriodo(anoAlvo, mesAlvo)
      const linha = statusAtual.find((s) => s.cod_consultor === cod)
      if (linha) setStatus(linha)
      if (linha && (linha.status === 'concluido' || linha.status === 'erro')) break
      await new Promise((r) => setTimeout(r, INTERVALO_POLLING_MS))
    }
    setAcompanhando(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cod = Number(codConsultor)
    if (!cod || !ano || !mes) {
      setErroEnvio('Preencha consultor, ano e mês.')
      return
    }
    setErroEnvio(null)
    setStatus({ cod_consultor: cod, status: 'pendente', erro_mensagem: null })
    setAcompanhando(true)

    const resultado = await solicitarApuracao(cod, ano, mes)
    if (!resultado.ok) {
      setErroEnvio(resultado.erro ?? 'Erro desconhecido ao pedir a geração.')
      setAcompanhando(false)
      return
    }

    acompanhar(cod, ano, mes)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <div>
        <label htmlFor="cod_consultor" className="block text-sm font-medium text-slate-700">
          Código do consultor (Ileva)
        </label>
        <input
          id="cod_consultor"
          type="number"
          required
          value={codConsultor}
          disabled={acompanhando}
          onChange={(e) => setCodConsultor(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="mes" className="block text-sm font-medium text-slate-700">
            Mês
          </label>
          <input
            id="mes"
            type="number"
            min={1}
            max={12}
            required
            value={mes}
            disabled={acompanhando}
            onChange={(e) => setMes(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="ano" className="block text-sm font-medium text-slate-700">
            Ano
          </label>
          <input
            id="ano"
            type="number"
            required
            value={ano}
            disabled={acompanhando}
            onChange={(e) => setAno(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={acompanhando}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {acompanhando ? 'Gerando apuração...' : 'Gerar apuração'}
      </button>

      {erroEnvio ? <p className="text-sm text-red-600">{erroEnvio}</p> : null}
      {status?.status === 'erro' ? (
        <p className="text-sm text-red-600">Erro: {status.erro_mensagem}</p>
      ) : null}
      {status?.status === 'concluido' ? (
        <p className="text-sm text-emerald-700">
          Apuração gerada com sucesso — veja o resultado no painel do Consultor ou do Gestor.
        </p>
      ) : null}
      {acompanhando ? (
        <p className="text-xs text-slate-400">
          Processando em segundo plano — pode fechar esta aba, o processamento continua. Consultores
          grandes podem levar vários minutos.
        </p>
      ) : null}
    </form>
  )
}
