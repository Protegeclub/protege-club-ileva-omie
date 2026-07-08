'use client'

import { useActionState } from 'react'
import { entrar } from './actions'

const estadoInicial = { erro: '' }

export default function LoginPage() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Protege Club</h1>
          <p className="text-sm text-slate-500">Apuração de comissões</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {estado?.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pendente ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
