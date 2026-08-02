'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Ações de "minha conta" — comuns a Gestor e Consultor (trocar a própria senha, editar o
// próprio nome), sem nenhuma regra específica de perfil. Compartilhado em vez de duplicado nos
// dois lados, diferente do resto do app (que tolera duplicação entre as árvores Gestor/
// Consultor) porque aqui não existe NENHUMA diferença de negócio entre os dois papéis — é puro
// self-service sobre a própria sessão.

export interface AtualizarNomeEstado {
  ok?: boolean
  erro?: string
}

export async function atualizarNomeProprioAction(
  _estadoAnterior: AtualizarNomeEstado,
  formData: FormData
): Promise<AtualizarNomeEstado> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { erro: 'Sessão expirada, faça login novamente.' }

  const nome = String(formData.get('nome') ?? '').trim()
  if (!nome) return { erro: 'Informe um nome.' }
  if (nome.length > 100) return { erro: 'Nome muito longo.' }

  const { error } = await supabase.from('perfis').update({ nome }).eq('user_id', userData.user.id)
  if (error) return { erro: `Erro ao salvar: ${error.message}` }

  revalidatePath('/gestor/configuracoes')
  revalidatePath('/consultor/configuracoes')
  return { ok: true }
}

export interface TrocarSenhaEstado {
  ok?: boolean
  erro?: string
}

// Reautentica com a senha atual antes de trocar (mesmo padrão de qualquer sistema sério) — sem
// isso, qualquer um com uma sessão aberta (computador compartilhado, sessão esquecida) poderia
// trocar a senha sem saber a atual.
export async function trocarSenhaProprioAction(
  _estadoAnterior: TrocarSenhaEstado,
  formData: FormData
): Promise<TrocarSenhaEstado> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user?.email) return { erro: 'Sessão expirada, faça login novamente.' }

  const senhaAtual = String(formData.get('senha_atual') ?? '')
  const senhaNova = String(formData.get('senha_nova') ?? '')
  const senhaConfirmacao = String(formData.get('senha_confirmacao') ?? '')

  if (!senhaAtual || !senhaNova || !senhaConfirmacao) {
    return { erro: 'Preencha todos os campos.' }
  }
  if (senhaNova.length < 6) {
    return { erro: 'A nova senha precisa ter pelo menos 6 caracteres.' }
  }
  if (senhaNova !== senhaConfirmacao) {
    return { erro: 'A confirmação não bate com a nova senha.' }
  }

  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: senhaAtual,
  })
  if (erroLogin) return { erro: 'Senha atual incorreta.' }

  const { error: erroUpdate } = await supabase.auth.updateUser({ password: senhaNova })
  if (erroUpdate) return { erro: `Erro ao trocar a senha: ${erroUpdate.message}` }

  return { ok: true }
}
