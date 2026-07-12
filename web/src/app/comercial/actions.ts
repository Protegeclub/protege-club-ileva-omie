'use server'

import { tasks } from '@trigger.dev/sdk/v3'
import { revalidatePath } from 'next/cache'
import type { GerarApuracaoPayload, gerarApuracaoTask } from '@/trigger/gerar-apuracao'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Autorizacao = { userId: string } | { erro: string }

async function autorizarComercialOuGestor(): Promise<Autorizacao> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  // Defesa em profundidade: reconfirma o perfil aqui, não confia só no proxy.ts (ver nota em
  // src/proxy.ts sobre o próprio Next.js avisar que isso pode ser contornado).
  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfilRow || (perfilRow.perfil !== 'gestor' && perfilRow.perfil !== 'comercial')) {
    return { erro: 'Sem permissão para gerar apuração.' }
  }

  return { userId: userData.user.id }
}

export interface StatusJob {
  cod_consultor: number
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  erro_mensagem: string | null
}

// Cria (ou reinicia) o acompanhamento de status e dispara a geração em segundo plano no
// Trigger.dev — não espera o resultado aqui (ver web/src/trigger/gerar-apuracao.ts: alguns
// consultores levam até 31min pra gerar, inviável dentro de uma Server Action síncrona na
// Vercel). O client acompanha o progresso consultando `consultarStatusPeriodo`.
export async function solicitarApuracao(
  codConsultor: number,
  ano: number,
  mes: number
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarComercialOuGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  if (!codConsultor || !ano || !mes) {
    return { ok: false, erro: 'Informe consultor, ano e mês.' }
  }

  const admin = createSupabaseAdminClient()

  const { error: erroUpsert } = await admin.from('apuracao_jobs').upsert(
    {
      cod_consultor: codConsultor,
      ano,
      mes,
      status: 'pendente',
      erro_mensagem: null,
      solicitado_por: auth.userId,
      solicitado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'cod_consultor,ano,mes' }
  )

  if (erroUpsert) {
    return { ok: false, erro: `Erro ao registrar o pedido: ${erroUpsert.message}` }
  }

  try {
    const payload: GerarApuracaoPayload = {
      codConsultor,
      ano,
      mes,
      geradoPorUserId: auth.userId,
    }
    const handle = await tasks.trigger<typeof gerarApuracaoTask>('gerar-apuracao', payload)

    await admin
      .from('apuracao_jobs')
      .update({ trigger_run_id: handle.id })
      .eq('cod_consultor', codConsultor)
      .eq('ano', ano)
      .eq('mes', mes)

    return { ok: true }
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido ao disparar a tarefa.'
    await admin
      .from('apuracao_jobs')
      .update({ status: 'erro', erro_mensagem: mensagem })
      .eq('cod_consultor', codConsultor)
      .eq('ano', ano)
      .eq('mes', mes)
    return { ok: false, erro: mensagem }
  }
}

// Consultada em loop pelo client (GerarApuracaoForm e GerarLoteForm) pra saber o andamento sem
// precisar esperar uma chamada só terminar.
export async function consultarStatusPeriodo(ano: number, mes: number): Promise<StatusJob[]> {
  const auth = await autorizarComercialOuGestor()
  if ('erro' in auth) return []

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('apuracao_jobs')
    .select('cod_consultor, status, erro_mensagem')
    .eq('ano', ano)
    .eq('mes', mes)

  return (data ?? []) as StatusJob[]
}

// Chamada pelo client quando encerra de acompanhar um lote (todo mundo concluído/erro, ou
// cancelado) — as páginas /consultor e /gestor já renderizam dinamicamente (dependem de cookie
// de sessão/searchParams), então isso é mais reforço do que estritamente necessário.
export async function revalidarPaineisAposLote() {
  revalidatePath('/consultor')
  revalidatePath('/gestor')
}
