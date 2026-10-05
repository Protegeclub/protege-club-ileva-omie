import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// "Total Equipe" (quantas adesões o time do consultor fez) só soma quem JÁ teve a apuração
// gerada nesse mês (mesma limitação de "sob demanda" do resto do sistema — ver
// CONTEXTO_E_CHECKLIST.md). Colegas sem apuração gerada não entram na conta.
// Placas ativadas no mês pelos COLEGAS da equipe (sem o consultor informado), usado no bônus por
// nível de líder de equipe (ver LIDERES_DE_EQUIPE em bonus-nivel.ts). Mesma limitação do "Total
// Equipe": só conta quem já teve a apuração gerada no mês — gere a do líder por último.
export async function totalPlacasAtivadasColegasEquipe(
  codEquipe: number,
  codConsultorExcluir: number,
  ano: number,
  mes: number
): Promise<number> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('apuracoes_mensais')
    .select('detalhe')
    .eq('cod_equipe', codEquipe)
    .eq('ano', ano)
    .eq('mes', mes)
    .neq('cod_consultor', codConsultorExcluir)

  return (data ?? []).reduce((soma: number, row) => {
    const placas = (row.detalhe as { placasAtivadas?: unknown[] } | null)?.placasAtivadas ?? []
    return soma + placas.length
  }, 0)
}

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
