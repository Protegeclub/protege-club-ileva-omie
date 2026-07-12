'use client'

import { useActionState } from 'react'
import { convidarGestor, type ConvidarEstado } from './actions'

const estadoInicial: ConvidarEstado = {}

export function ConvidarGestorForm() {
  const [estado, formAction, pendente] = useActionState(convidarGestor, estadoInicial)

  if (estado.sucesso) {
    return (
      <p className="text-sm text-emerald-700">
        Convite enviado para {estado.emailConvidado} — a pessoa define a própria senha ao clicar
        no link do e-mail.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="nome-gestor" className="block text-xs font-medium text-slate-500">
          Nome
        </label>
        <input
          id="nome-gestor"
          name="nome"
          type="text"
          required
          className="mt-1 w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email-gestor" className="block text-xs font-medium text-slate-500">
          E-mail
        </label>
        <input
          id="email-gestor"
          name="email"
          type="email"
          required
          className="mt-1 w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pendente ? 'Convidando...' : 'Convidar como Gestor'}
      </button>
      {estado.erro ? <p className="w-full text-sm text-red-600">{estado.erro}</p> : null}
    </form>
  )
}
