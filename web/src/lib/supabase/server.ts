import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

// Uso em Server Components/Actions/Route Handlers. Chama `cookies()` do Next.js, o que faz a
// rota que usar esta função ser renderizada dinamicamente (não em build/SSG) — comportamento
// esperado para qualquer página que dependa de sessão do usuário.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Chamado de dentro de um Server Component (sem acesso de escrita a cookies).
          // Seguro ignorar aqui: o proxy.ts é responsável por renovar a sessão nesses casos.
        }
      },
    },
  })
}
