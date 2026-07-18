'use client'

import Image from 'next/image'
import { useActionState } from 'react'
import { Botao } from '@/lib/ui/botao'
import { entrar } from './actions'

const estadoInicial = { erro: '' }

export default function LoginPage() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-2 text-center">
          <Image
            src="/Logo Protege Club.png"
            alt="Protege Club"
            width={56}
            height={56}
            priority
            className="mx-auto h-14 w-14"
          />
          <h1 className="text-lg font-semibold text-brand-navy">Protege Club</h1>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        {estado?.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

        <Botao type="submit" disabled={pendente} className="w-full">
          {pendente ? 'Entrando...' : 'Entrar'}
        </Botao>
      </form>
    </main>
  )
}
