'use server'

import { redirect } from 'next/navigation'
import { obterUrlBase } from '@/lib/auth/url-base'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function entrar(_prevState: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { erro: 'E-mail ou senha inválidos.' }
  }

  redirect('/')
}

export interface RecuperarSenhaEstado {
  sucesso?: boolean
  erro?: string
}

// Dispara o e-mail de redefinição de senha do próprio Supabase Auth (mesmo mecanismo já
// comprovado funcionando no convite de acesso — ver gestor/acessos/actions.ts). Roda com a
// chave anônima (não precisa de admin: é uma ação pública, feita por quem nem conseguiu logar
// ainda) e sempre devolve sucesso, exista ou não esse e-mail cadastrado — o próprio
// `resetPasswordForEmail` já não erra nesse caso, então não precisa de lógica extra pra evitar
// que alguém descubra por tentativa quais e-mails têm conta no sistema.
export async function enviarLinkRecuperacaoAction(
  _estadoAnterior: RecuperarSenhaEstado,
  formData: FormData
): Promise<RecuperarSenhaEstado> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { erro: 'Informe seu e-mail.' }

  const supabase = await createSupabaseServerClient()
  const urlBase = await obterUrlBase()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: urlBase ? `${urlBase}/definir-senha` : undefined,
  })

  if (error) {
    return { erro: `Não foi possível enviar o link: ${error.message}` }
  }

  return { sucesso: true }
}
