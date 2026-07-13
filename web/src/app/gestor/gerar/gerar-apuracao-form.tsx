'use client'

import { useRef, useState } from 'react'
import { consultarStatusPeriodo, solicitarApuracao, type StatusJob } from './actions'
import { IconeCheckCircle, IconeRelampago, IconeSpinner, IconeXCircle } from './icones'
import { formatarDuracao, useCronometro } from './usar-cronometro'

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
  const segundos = useCronometro(acompanhando)

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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <IconeRelampago className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Gerar um consultor específico</h2>
          <p className="text-xs text-slate-500">
            Busca no Ileva e calcula adesão + recorrência do mês informado.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="cod_consultor" className="block text-xs font-medium text-slate-500">
              Código do consultor
            </label>
            <input
              id="cod_consultor"
              type="number"
              required
              value={codConsultor}
              disabled={acompanhando}
              onChange={(e) => setCodConsultor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="mes" className="block text-xs font-medium text-slate-500">
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="ano" className="block text-xs font-medium text-slate-500">
              Ano
            </label>
            <input
              id="ano"
              type="number"
              required
              value={ano}
              disabled={acompanhando}
              onChange={(e) => setAno(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={acompanhando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {acompanhando ? (
            <>
              <IconeSpinner className="h-4 w-4" />
              Gerando... {formatarDuracao(segundos)}
            </>
          ) : (
            'Gerar apuração'
          )}
        </button>

        {erroEnvio ? (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <IconeXCircle className="h-4 w-4 shrink-0" />
            {erroEnvio}
          </p>
        ) : null}

        {status?.status === 'erro' ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <IconeXCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Erro: {status.erro_mensagem}</span>
          </div>
        ) : null}

        {status?.status === 'concluido' ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <IconeCheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Apuração gerada com sucesso — veja o resultado na tabela acima ou no painel do
              Consultor.
            </span>
          </div>
        ) : null}

        {acompanhando ? (
          <p className="text-xs text-slate-400">
            Processando em segundo plano — pode fechar esta aba, o processamento continua.
            Consultores grandes podem levar vários minutos.
          </p>
        ) : null}
      </form>
    </div>
  )
}
