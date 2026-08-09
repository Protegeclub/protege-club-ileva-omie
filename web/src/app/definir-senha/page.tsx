'use client'

import Image from 'next/image'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Botao } from '@/lib/ui/botao'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Landing do link de convite/recuperação de senha. Dois formatos de link chegam aqui:
// 1) `?token_hash=...&type=invite|recovery` — o link que a gente mesmo monta em
//    `gerarLinkAcesso` (botão "Copiar link"). De propósito NÃO é o link hospedado do Supabase
//    (`.../auth/v1/verify?token=...`), que redime o token com um simples GET — qualquer preview
//    automático (WhatsApp/Telegram/Slack) ou scanner de e-mail que "visite" a URL antes da
//    pessoa já consome o token de uso único. Aqui a troca só acontece via `verifyOtp`, chamado
//    por JS quando um navegador de verdade carrega a página — bots de preview não executam JS.
// 2) Fragmento `#access_token=...` — formato antigo (e o que o próprio e-mail de convite do
//    Supabase ainda usa hoje, `{{ .ConfirmationURL }}`); o cliente do browser detecta isso
//    sozinho ao carregar (detectSessionInUrl, ligado por padrão).
// Por isso o proxy.ts deixa essa rota passar mesmo sem sessão visível no servidor: só o JS do
// navegador consegue processar os dois formatos.
export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <DefinirSenhaConteudo />
    </Suspense>
  )
}

function DefinirSenhaConteudo() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [temSessao, setTemSessao] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const tokenHash = searchParams.get('token_hash')
    const tipo = searchParams.get('type')

    async function estabelecerSessao() {
      if (tokenHash && (tipo === 'invite' || tipo === 'recovery')) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
        if (error) {
          setTemSessao(false)
          setCarregandoSessao(false)
          return
        }
      }
      const { data } = await supabase.auth.getSession()
      setTemSessao(!!data.session)
      setCarregandoSessao(false)
    }

    estabelecerSessao()
  }, [searchParams])

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
        <p className="text-sm text-slate-500">Carregando…</p>
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
            alt="ProtegeClub"
            width={56}
            height={56}
            priority
            className="mx-auto h-14 w-14"
          />
          <h1 className="text-lg font-semibold text-brand-navy">Defina sua senha</h1>
          <p className="text-sm text-slate-500">ProtegeClub — Apuração de comissões</p>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-blue focus-visible:ring-1 focus-visible:ring-brand-blue"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-brand-blue focus-visible:ring-1 focus-visible:ring-brand-blue"
          />
        </div>

        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Salvando…' : 'Salvar e entrar'}
        </Botao>
      </form>
    </main>
  )
}
