'use client'

import Image from 'next/image'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
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
    <Suspense fallback={<Layout><p className="text-center text-sm text-slate-500">Carregando…</p></Layout>}>
      <DefinirSenhaConteudo />
    </Suspense>
  )
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3 text-center">
          {/* A logo tem preenchimento branco/traço claro (pensada pro fundo navy da sidebar) —
              sobre o cartão branco desta tela ela ficava invisível. Mesmo chip navy já usado em
              login-form.tsx pra resolver o mesmo problema, sem reprocessar o arquivo da logo. */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy">
            <Image
              src="/Logo Protege Club.png"
              alt="ProtegeClub"
              width={56}
              height={56}
              priority
              className="h-9 w-9"
            />
          </div>
          <p className="text-sm text-slate-500">ProtegeClub — Apuração de comissões</p>
        </div>
        {children}
      </div>
    </main>
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
      // Checa se já existe sessão ANTES de tentar validar o token — cobre um caso real: o
      // consultor abre o link, a aba recarrega/é reaberta antes de definir a senha (comum em
      // navegador mobile, ou só clicar de novo no mesmo link do WhatsApp pra "voltar" pra tela).
      // `token_hash` é de uso único — a primeira abertura já consumiu ele e criou a sessão, mas
      // a sessão em si continua válida neste navegador. Sem essa checagem, qualquer reabertura
      // do mesmo link caía direto em "Link inválido ou expirado", mesmo já estando logado.
      const { data: sessaoExistente } = await supabase.auth.getSession()
      if (sessaoExistente.session) {
        if (tokenHash) router.replace('/definir-senha')
        setTemSessao(true)
        setCarregandoSessao(false)
        return
      }

      if (tokenHash && (tipo === 'invite' || tipo === 'recovery')) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
        if (!error) {
          // Limpa o token da URL assim que a sessão é estabelecida — evita reenviar o mesmo
          // token (já consumido) num F5 acidental antes de a pessoa salvar a senha.
          router.replace('/definir-senha')
          setTemSessao(true)
          setCarregandoSessao(false)
          return
        }
      }

      setTemSessao(false)
      setCarregandoSessao(false)
    }

    estabelecerSessao()
  }, [searchParams, router])

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
    return <Layout><p className="text-center text-sm text-slate-500">Carregando…</p></Layout>
  }

  if (!temSessao) {
    return (
      <Layout>
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-brand-navy">Link inválido ou expirado</h1>
          <p className="text-sm text-slate-500">
            Esse link já foi usado ou não é mais válido. Peça para o Gestor gerar um novo convite
            e reenviar assim que possível — não abra o link mais de uma vez antes de definir a
            senha.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <form onSubmit={aoSubmeter} className="space-y-5">
        <h1 className="text-center text-lg font-semibold text-brand-navy">Defina sua senha</h1>

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
    </Layout>
  )
}
