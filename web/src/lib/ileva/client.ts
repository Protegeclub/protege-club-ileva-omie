import { env } from '@/lib/env'

// A API do Ileva emite um token único por usuário: um novo login invalida o anterior
// (ver docs/api-ileva/ENDPOINTS.md). Por isso o token é cacheado em memória do processo em vez
// de ser gerado a cada chamada — evita invalidar um token em uso por outra requisição
// concorrente. `expires_in` vem em segundos (24h hoje).
//
// ATENÇÃO ao rodar em serverless (Vercel): cada instância/lambda tem sua própria memória, então
// duas instâncias concorrentes podem gerar tokens que se invalidam mutuamente. Antes de ir para
// produção, mover esse cache para um lugar compartilhado (tabela no Supabase ou similar) com
// lock para evitar corrida. Ver item correspondente em CONTEXTO_E_CHECKLIST.md (seção 6.4).
let cachedToken: { value: string; expiresAt: number } | null = null

async function fetchToken(): Promise<string> {
  const res = await fetch(`${env.ileva.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      app_key: env.ileva.appKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: env.ileva.username,
      password: env.ileva.password,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao autenticar na API do Ileva (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: string }
  const expiresInMs = Number(data.expires_in) * 1000
  // Renova 60s antes de expirar para evitar corrida com uma chamada em andamento.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + expiresInMs - 60_000 }
  return cachedToken.value
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }
  return fetchToken()
}

export async function ilevaGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const token = await getToken()
  const url = new URL(`${env.ileva.baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro na API do Ileva em ${path} (${res.status}): ${body}`)
  }

  return res.json() as Promise<T>
}
