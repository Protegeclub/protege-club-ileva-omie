import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// "Total Equipe" (quantas adesões o time do consultor fez) só soma quem JÁ teve a apuração
// gerada nesse mês (mesma limitação de "sob demanda" do resto do sistema — ver
// CONTEXTO_E_CHECKLIST.md). Colegas sem apuração gerada não entram na conta.
export async function totalAdesoesEquipe(
  codEquipe: number,
  codConsultorExcluir: number,
  ano: number,
  mes: number
): Promise<number> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('apuracoes_mensais')
    .select('detalhe, cod_consultor')
    .eq('cod_equipe', codEquipe)
    .eq('ano', ano)
    .eq('mes', mes)
    .neq('cod_consultor', codConsultorExcluir)

  return (data ?? []).reduce((soma: number, row) => {
    const adesoes = (row.detalhe as { adesoes?: unknown[] } | null)?.adesoes ?? []
    return soma + adesoes.length
  }, 0)
}
