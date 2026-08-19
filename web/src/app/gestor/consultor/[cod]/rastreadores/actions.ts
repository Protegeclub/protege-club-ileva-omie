'use server'

import { revalidatePath } from 'next/cache'
import type { ApuracaoDetalhe } from '@/app/consultor/tipos'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Autorizacao = { userId: string } | { erro: string }

async function autorizarGestor(): Promise<Autorizacao> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    return { erro: 'Sem permissão.' }
  }

  return { userId: userData.user.id }
}

interface ItemExclusao {
  cod_veiculo: number
  cod_consultor: number
  placa: string
  associado: string
  valor: number
}

// Exclusão manual de um desconto de rastreador — pedido do cliente (18/08/2026): alguns
// consultores não devem ser cobrados por um veículo específico, decisão caso a caso do Gestor.
// Grava em rastreador_exclusoes (pra sobreviver a qualquer regeração futura da apuração — ver
// lib/apuracao/gerar.ts) E já patcha a apuração do mês corrente aqui mesmo, pra efeito imediato
// sem precisar regerar.
export async function excluirDescontoRastreadorAction(
  item: ItemExclusao,
  ano: number,
  mes: number
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  const admin = createSupabaseAdminClient()

  const { error: erroExclusao } = await admin.from('rastreador_exclusoes').upsert(
    {
      cod_veiculo: item.cod_veiculo,
      cod_consultor: item.cod_consultor,
      placa: item.placa,
      associado: item.associado,
      valor: item.valor,
      excluido_por: auth.userId,
    },
    { onConflict: 'cod_veiculo' }
  )

  if (erroExclusao) {
    return { ok: false, erro: erroExclusao.message }
  }

  const { data: apuracao } = await admin
    .from('apuracoes_mensais')
    .select('id, total_desconto_rastreador, total_liquido, detalhe')
    .eq('cod_consultor', item.cod_consultor)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle<{
      id: string
      total_desconto_rastreador: number
      total_liquido: number
      detalhe: ApuracaoDetalhe
    }>()

  if (apuracao) {
    const descontosRastreador = (apuracao.detalhe.descontosRastreador ?? []).filter(
      (d) => d.cod_veiculo !== item.cod_veiculo
    )

    const { error: erroUpdate } = await admin
      .from('apuracoes_mensais')
      .update({
        total_desconto_rastreador: apuracao.total_desconto_rastreador - item.valor,
        total_liquido: apuracao.total_liquido + item.valor,
        detalhe: { ...apuracao.detalhe, descontosRastreador },
      })
      .eq('id', apuracao.id)

    if (erroUpdate) {
      return { ok: false, erro: erroUpdate.message }
    }
  }

  revalidatePath(`/gestor/consultor/${item.cod_consultor}/rastreadores`)
  revalidatePath(`/gestor/consultor/${item.cod_consultor}`)
  return { ok: true }
}
