'use client'

import { useActionState } from 'react'
import { convidarConsultor, type ConvidarEstado } from './actions'

const estadoInicial: ConvidarEstado = {}

export function ConvidarButton({ codConsultor }: { codConsultor: number }) {
  const [estado, formAction, pendente] = useActionState(convidarConsultor, estadoInicial)

  if (estado.sucesso) {
    return (
      <span className="text-xs text-emerald-700">
        Convite enviado para {estado.emailConvidado}
      </span>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="cod_consultor" value={codConsultor} />
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pendente ? 'Convidando...' : 'Convidar'}
      </button>
      {estado.erro ? <span className="text-xs text-red-600">{estado.erro}</span> : null}
    </form>
  )
}
