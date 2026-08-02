import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CartaoMinhaConta } from '@/lib/ui/cartao-minha-conta'

async function buscarUsuarioCompleto() {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfil) return null
  return { nome: perfil.nome, perfil: perfil.perfil, email: userData.user.email ?? '—' }
}

export default async function ConsultorConfiguracoesPage() {
  const usuario = await buscarUsuarioCompleto()

  if (!usuario) {
    return <p className="text-sm text-red-600">Sessão expirada. Faça login novamente.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Sua conta de acesso ao sistema.</p>
      </div>

      <CartaoMinhaConta nomeAtual={usuario.nome} email={usuario.email} perfil={usuario.perfil} />
    </div>
  )
}
