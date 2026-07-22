import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface UsuarioLogado {
  nome: string
  perfil: 'gestor' | 'consultor'
}

// Usado pelos dois layouts (gestor, consultor) só pra mostrar nome/perfil no card do menu
// lateral — chama cookies() (via createSupabaseServerClient), então qualquer rota que renderize
// o layout que usa isso vira dinâmica por request (mesmo custo que o proxy.ts já paga em toda
// requisição pra checar a sessão).
export async function buscarUsuarioLogado(): Promise<UsuarioLogado | null> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfil) return null

  return { nome: perfil.nome, perfil: perfil.perfil }
}
