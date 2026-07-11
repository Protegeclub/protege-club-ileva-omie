import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Cliente com a service role key — ignora RLS. Só pode ser importado de código que roda no
// servidor (Server Actions, Route Handlers), nunca em Client Components. Usado para operações
// administrativas: escrever apuracoes_mensais, ler perfis de outros usuários (Gestor/Comercial
// vendo a lista de consultores), etc.
export function createSupabaseAdminClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
