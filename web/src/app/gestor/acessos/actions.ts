'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { buscarConsultor } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ConvidarEstado {
  sucesso?: boolean
  erro?: string
  emailConvidado?: string
}

async function confirmarGestor() {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sessão expirada, faça login novamente.')

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    throw new Error('Só o Gestor pode convidar consultores.')
  }
}

export async function convidarConsultor(
  _estadoAnterior: ConvidarEstado,
  formData: FormData
): Promise<ConvidarEstado> {
  try {
    await confirmarGestor()
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const codConsultor = Number(formData.get('cod_consultor'))
  if (!codConsultor) {
    return { erro: 'cod_consultor inválido.' }
  }

  const admin = createSupabaseAdminClient()

  // Evita convidar de novo quem já tem acesso.
  const { data: perfilExistente } = await admin
    .from('perfis')
    .select('user_id')
    .eq('cod_consultor', codConsultor)
    .maybeSingle()

  if (perfilExistente) {
    return { erro: 'Este consultor já tem acesso ao sistema.' }
  }

  let email: string
  let nome: string
  try {
    const { consultor } = await buscarConsultor({ cod_consultor: codConsultor })
    email = consultor.email?.trim()
    nome = consultor.nome
  } catch (e) {
    return { erro: `Não achei o consultor no Ileva: ${e instanceof Error ? e.message : e}` }
  }

  if (!email) {
    return { erro: `Consultor "${nome}" não tem e-mail cadastrado no Ileva — não dá pra convidar por e-mail.` }
  }

  const origin = (await headers()).get('origin') ?? undefined

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: origin ? `${origin}/definir-senha` : undefined,
  })

  if (erroConvite || !convite.user) {
    return { erro: `Falha ao convidar (${email}): ${erroConvite?.message ?? 'erro desconhecido'}` }
  }

  const { error: erroPerfil } = await admin.from('perfis').insert({
    user_id: convite.user.id,
    nome,
    perfil: 'consultor',
    cod_consultor: codConsultor,
  })

  if (erroPerfil) {
    return { erro: `Convite enviado, mas falhou ao salvar o perfil: ${erroPerfil.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true, emailConvidado: email }
}
