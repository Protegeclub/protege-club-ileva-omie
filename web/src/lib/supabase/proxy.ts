import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

// Variante do cliente Supabase para uso dentro de src/proxy.ts (antigo middleware.ts no Next
// 16 — ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Segue o padrão oficial do Supabase para renovar a sessão a cada request.
export function createSupabaseProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  return { supabase, getResponse: () => response }
}
