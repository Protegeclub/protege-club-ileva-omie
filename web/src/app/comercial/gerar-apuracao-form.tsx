'use client'

import { useActionState } from 'react'
import { gerarApuracao, type GerarApuracaoEstado } from './actions'

const estadoInicial: GerarApuracaoEstado = {}

const hoje = new Date()

export function GerarApuracaoForm() {
  const [estado, formAction, pendente] = useActionState(gerarApuracao, estadoInicial)

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <label htmlFor="cod_consultor" className="block text-sm font-medium text-slate-700">
          Código do consultor (Ileva)
        </label>
        <input
          id="cod_consultor"
          name="cod_consultor"
          type="number"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="mes" className="block text-sm font-medium text-slate-700">
            Mês
          </label>
          <input
            id="mes"
            name="mes"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={hoje.getMonth() + 1}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="ano" className="block text-sm font-medium text-slate-700">
            Ano
          </label>
          <input
            id="ano"
            name="ano"
            type="number"
            required
            defaultValue={hoje.getFullYear()}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pendente ? 'Gerando apuração...' : 'Gerar apuração'}
      </button>

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}
      {estado.sucesso && estado.resumo ? (
        <p className="text-sm text-emerald-700">
          Apuração gerada: adesão R$ {estado.resumo.totalAdesao.toFixed(2)} · recorrência R${' '}
          {estado.resumo.totalRecorrencia.toFixed(2)}
        </p>
      ) : null}
    </form>
  )
}
