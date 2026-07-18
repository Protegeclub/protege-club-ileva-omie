'use client'

import { useActionState } from 'react'
import { Botao } from '@/lib/ui/botao'
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
          className="mt-1 w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
          className="mt-1 w-64 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Convidando...' : 'Convidar como Gestor'}
      </Botao>
      {estado.erro ? <p className="w-full text-sm text-red-600">{estado.erro}</p> : null}
    </form>
  )
}
