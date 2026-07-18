'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/lib/ui/botao'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Landing do link de convite/recuperação de senha. O Supabase entrega a sessão pela própria URL
// (fragmento #access_token=...) — o cliente do browser detecta isso sozinho ao carregar
// (detectSessionInUrl, ligado por padrão). Por isso o proxy.ts deixa essa rota passar mesmo sem
// sessão visível no servidor: só o JS do navegador consegue processar esse link.
export default function DefinirSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [temSessao, setTemSessao] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setTemSessao(!!data.session)
      setCarregandoSessao(false)
    })
  }, [])

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }

    setEnviando(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (carregandoSessao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Carregando...</p>
      </main>
    )
  }

  if (!temSessao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="max-w-sm text-center text-sm text-slate-500">
          Link inválido ou expirado. Peça para o Gestor enviar um novo convite.
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={aoSubmeter}
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
          <h1 className="text-lg font-semibold text-brand-navy">Defina sua senha</h1>
          <p className="text-sm text-slate-500">Protege Club — Apuração de comissões</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="senha" className="text-sm font-medium text-slate-700">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmacao" className="text-sm font-medium text-slate-700">
            Confirmar senha
          </label>
          <input
            id="confirmacao"
            type="password"
            required
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Salvando...' : 'Salvar e entrar'}
        </Botao>
      </form>
    </main>
  )
}
