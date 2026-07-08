import { env } from '@/lib/env'

// Ainda sem chave de teste da Omie (ver CONTEXTO_E_CHECKLIST.md, seção 6.5). Este cliente segue
// a convenção real da API da Omie (endpoints por "call" dentro de um recurso, autenticação por
// app_key/app_secret no corpo — não por header), documentada em:
// https://app.omie.com.br/api/v1/financas/contapagar/
//
// Método a implementar quando tivermos a chave: IncluirContaPagar. Payload mínimo conforme a
// documentação da Omie: cliente/fornecedor, categoria, conta corrente, vencimento, valor e
// código de integração (para evitar duplicidade em reprocessamento).

interface OmieCallParams {
  call: string
  param: Record<string, unknown>[]
}

export async function omieCall<T>(resource: string, params: OmieCallParams): Promise<T> {
  const res = await fetch(`${env.omie.baseUrl}/${resource}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      call: params.call,
      app_key: env.omie.appKey,
      app_secret: env.omie.appSecret,
      param: params.param,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro na API da Omie em ${resource}/${params.call} (${res.status}): ${body}`)
  }

  return res.json() as Promise<T>
}

// TODO (bloqueado até termos a chave de teste): implementar incluirContaPagar() usando
// omieCall('financas/contapagar', { call: 'IncluirContaPagar', param: [...] }) com:
// - codigo_lancamento_integracao gerado por nós (para dedupe em reprocessamento)
// - registro em auditoria (quem gerou, quando, valor, consultor, retorno da Omie)
// Ver seção 6.5 de CONTEXTO_E_CHECKLIST.md.
