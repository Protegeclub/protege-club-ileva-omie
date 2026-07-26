'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { buscarConsultorSemCache } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ConvidarEstado {
  sucesso?: boolean
  erro?: string
  emailConvidado?: string
}

export interface RemoverAcessoEstado {
  sucesso?: boolean
  erro?: string
}

export interface LinkAcessoEstado {
  sucesso?: boolean
  erro?: string
  link?: string
}

export interface EditarEmailEstado {
  sucesso?: boolean
  erro?: string
}

// Prioriza NEXT_PUBLIC_SITE_URL (fixo, configurado no ambiente) sobre o header Origin da
// requisição — antes o link do convite saía com o domínio que o Gestor por acaso estava usando
// no navegador no momento do clique (localhost durante um teste local, uma URL de preview
// deploy etc.), o que quebrava o convite pra quem recebia de verdade. Cai no Origin só como
// fallback de conveniência pra dev local, quando a variável não está configurada.
async function obterUrlBase(): Promise<string | undefined> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL
  if (configurada) return configurada.replace(/\/+$/, '')
  return (await headers()).get('origin') ?? undefined
}

async function confirmarGestor(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Sessão expirada, faça login novamente.')

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    throw new Error('Só o Gestor pode convidar novos acessos.')
  }

  return { userId: userData.user.id }
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
    // Sem cache de propósito: isso decide pra qual e-mail o convite vai — um e-mail trocado no
    // Ileva há pouco não pode ir parar num cache de 60s e mandar o convite pro endereço antigo.
    const { consultor } = await buscarConsultorSemCache({ cod_consultor: codConsultor })
    email = consultor.email?.trim()
    nome = consultor.nome
  } catch (e) {
    return { erro: `Não achei o consultor no Ileva: ${e instanceof Error ? e.message : e}` }
  }

  if (!email) {
    return { erro: `Consultor "${nome}" não tem e-mail cadastrado no Ileva — não dá pra convidar por e-mail.` }
  }

  const urlBase = await obterUrlBase()

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: urlBase ? `${urlBase}/definir-senha` : undefined,
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

// Convida mais um Gestor (ex.: outro sócio/responsável) — diferente do convite de consultor,
// não existe um `cod_consultor` do Ileva pra buscar nome/e-mail, então quem convida digita os
// dois campos direto no formulário.
export async function convidarGestor(
  _estadoAnterior: ConvidarEstado,
  formData: FormData
): Promise<ConvidarEstado> {
  try {
    await confirmarGestor()
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()

  if (!nome || !email) {
    return { erro: 'Preencha nome e e-mail.' }
  }

  const admin = createSupabaseAdminClient()
  const urlBase = await obterUrlBase()

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: urlBase ? `${urlBase}/definir-senha` : undefined,
  })

  if (erroConvite || !convite.user) {
    return { erro: `Falha ao convidar (${email}): ${erroConvite?.message ?? 'erro desconhecido'}` }
  }

  const { error: erroPerfil } = await admin.from('perfis').insert({
    user_id: convite.user.id,
    nome,
    perfil: 'gestor',
    cod_consultor: null,
  })

  if (erroPerfil) {
    return { erro: `Convite enviado, mas falhou ao salvar o perfil: ${erroPerfil.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true, emailConvidado: email }
}

// Revoga o login do consultor — apaga o usuário no Supabase Auth, o que já apaga a linha de
// `perfis` junto (FK `on delete cascade`, ver migration 0001_init.sql). Não mexe em nada do
// Ileva nem em `apuracoes_mensais` — só quem consegue entrar no sistema. Se precisar dar acesso
// de volta depois, um novo convite cria um usuário do zero (senha nova, definida pela própria
// pessoa de novo).
export async function removerAcessoConsultor(
  _estadoAnterior: RemoverAcessoEstado,
  formData: FormData
): Promise<RemoverAcessoEstado> {
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

  const { data: perfil, error: erroBusca } = await admin
    .from('perfis')
    .select('user_id')
    .eq('cod_consultor', codConsultor)
    .eq('perfil', 'consultor')
    .maybeSingle()

  if (erroBusca || !perfil) {
    return { erro: 'Este consultor não tem acesso ativo.' }
  }

  const { error: erroDelete } = await admin.auth.admin.deleteUser(perfil.user_id)
  if (erroDelete) {
    return { erro: `Falha ao remover acesso: ${erroDelete.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true }
}

// Revoga o acesso de um Gestor — mesmo mecanismo de removerAcessoConsultor (apaga o usuário no
// Supabase Auth, cascata apaga a linha de `perfis`). Duas travas que não existem pro Consultor
// porque não fazem sentido lá: não deixa remover o ÚLTIMO gestor (ninguém mais poderia gerenciar
// acessos depois) nem remover a si mesmo (evita um logout acidental no meio da própria sessão).
export async function removerAcessoGestor(
  _estadoAnterior: RemoverAcessoEstado,
  formData: FormData
): Promise<RemoverAcessoEstado> {
  let userId: string
  try {
    ;({ userId } = await confirmarGestor())
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const userIdAlvo = String(formData.get('user_id') ?? '')
  if (!userIdAlvo) {
    return { erro: 'user_id inválido.' }
  }

  if (userIdAlvo === userId) {
    return { erro: 'Você não pode remover o próprio acesso.' }
  }

  const admin = createSupabaseAdminClient()

  const { count } = await admin
    .from('perfis')
    .select('user_id', { count: 'exact', head: true })
    .eq('perfil', 'gestor')

  if ((count ?? 0) <= 1) {
    return { erro: 'Não é possível remover o último Gestor com acesso ao sistema.' }
  }

  const { error: erroDelete } = await admin.auth.admin.deleteUser(userIdAlvo)
  if (erroDelete) {
    return { erro: `Falha ao remover acesso: ${erroDelete.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true }
}

// Reenvia o convite pra quem está com status "Convite pendente" (perfil existe, e-mail ainda
// não confirmado) — chama inviteUserByEmail de novo, mesmo mecanismo que o próprio dashboard do
// Supabase usa no botão "Resend invitation" pra usuário ainda não confirmado. Recusa se o
// e-mail já estiver confirmado, pra não arriscar reenviar convite pra quem já tem acesso ativo.
export async function reenviarConvite(
  _estadoAnterior: ConvidarEstado,
  formData: FormData
): Promise<ConvidarEstado> {
  try {
    await confirmarGestor()
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const codConsultor = Number(formData.get('cod_consultor'))
  if (!codConsultor) return { erro: 'cod_consultor inválido.' }

  const admin = createSupabaseAdminClient()

  const { data: perfil } = await admin
    .from('perfis')
    .select('user_id')
    .eq('cod_consultor', codConsultor)
    .eq('perfil', 'consultor')
    .maybeSingle()

  if (!perfil) return { erro: 'Este consultor não tem um convite pendente.' }

  const { data: usuario } = await admin.auth.admin.getUserById(perfil.user_id)
  const email = usuario.user?.email
  if (!email) return { erro: 'Não achei o e-mail desse usuário.' }
  if (usuario.user?.email_confirmed_at) {
    return { erro: 'Esse consultor já confirmou o acesso — não é mais um convite pendente.' }
  }

  const urlBase = await obterUrlBase()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: urlBase ? `${urlBase}/definir-senha` : undefined,
  })

  if (error) {
    return { erro: `Falha ao reenviar (${email}): ${error.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true, emailConvidado: email }
}

// Gera um link pra copiar e mandar manualmente (WhatsApp etc.), sem depender do e-mail chegar —
// usa generateLink, que só devolve a URL e não dispara e-mail nenhum sozinho. Tipo "invite" pra
// quem nunca confirmou (pendente), tipo "recovery" (redefinição de senha) pra quem já está
// ativo.
//
// Importante: NÃO devolvemos `data.properties.action_link` (o link hospedado do próprio
// Supabase, algo como `.../auth/v1/verify?token=...&type=...`). Esse link redime o token com um
// simples GET — qualquer coisa que "visite" a URL antes da pessoa (o preview automático que
// WhatsApp/Telegram/Slack geram ao colar um link, ou um scanner de segurança de e-mail) já
// consome o token de uso único, e o clique de verdade cai em "otp_expired". Em vez disso,
// montamos nosso próprio link pra `/definir-senha` carregando só o `token_hash` — a troca pela
// sessão de verdade só acontece via JS (`supabase.auth.verifyOtp`) quando um navegador de
// verdade abre a página, o que esses bots de preview não executam.
export async function gerarLinkAcesso(
  _estadoAnterior: LinkAcessoEstado,
  formData: FormData
): Promise<LinkAcessoEstado> {
  try {
    await confirmarGestor()
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const codConsultor = Number(formData.get('cod_consultor'))
  if (!codConsultor) return { erro: 'cod_consultor inválido.' }

  const admin = createSupabaseAdminClient()

  const { data: perfil } = await admin
    .from('perfis')
    .select('user_id')
    .eq('cod_consultor', codConsultor)
    .eq('perfil', 'consultor')
    .maybeSingle()

  if (!perfil) return { erro: 'Este consultor ainda não tem acesso — envie um convite primeiro.' }

  const { data: usuario } = await admin.auth.admin.getUserById(perfil.user_id)
  const email = usuario.user?.email
  if (!email) return { erro: 'Não achei o e-mail desse usuário.' }

  const urlBase = await obterUrlBase()
  const redirectTo = urlBase ? `${urlBase}/definir-senha` : undefined
  const ativo = !!usuario.user?.email_confirmed_at
  const tipo = ativo ? 'recovery' : 'invite'

  const { data, error } = await admin.auth.admin.generateLink({ type: tipo, email, options: { redirectTo } })

  if (error || !data) {
    return { erro: `Falha ao gerar o link: ${error?.message ?? 'erro desconhecido'}` }
  }

  const destino = urlBase ? `${urlBase}/definir-senha` : undefined
  const link = destino
    ? `${destino}?token_hash=${data.properties.hashed_token}&type=${tipo}`
    : data.properties.action_link

  return { sucesso: true, link }
}

// Corrige o e-mail de login de um consultor (não mexe no cadastro dele no Ileva — só o e-mail
// usado pra entrar no sistema). Ação de admin: `updateUserById` troca direto, sem exigir
// confirmação do novo endereço (diferente de um usuário trocando o próprio e-mail sozinho).
export async function editarEmailConsultor(
  _estadoAnterior: EditarEmailEstado,
  formData: FormData
): Promise<EditarEmailEstado> {
  try {
    await confirmarGestor()
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Sem permissão.' }
  }

  const codConsultor = Number(formData.get('cod_consultor'))
  const novoEmail = String(formData.get('email') ?? '').trim()
  if (!codConsultor) return { erro: 'cod_consultor inválido.' }
  if (!novoEmail) return { erro: 'Informe um e-mail.' }

  const admin = createSupabaseAdminClient()

  const { data: perfil } = await admin
    .from('perfis')
    .select('user_id')
    .eq('cod_consultor', codConsultor)
    .eq('perfil', 'consultor')
    .maybeSingle()

  if (!perfil) return { erro: 'Este consultor não tem acesso ativo.' }

  const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { email: novoEmail })
  if (error) {
    return { erro: `Falha ao atualizar o e-mail: ${error.message}` }
  }

  revalidatePath('/gestor/acessos')
  return { sucesso: true }
}
