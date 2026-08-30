import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Regra de negócio específica (a pedido do Samuel, 21/07/2026): o consultor #302 (Thiago
// Siqueira Abba) é gerente e recebe R$2,00 de comissão por placa ativada no mês de TODOS os
// outros consultores, exceto o consultor #19 (Marcos Aurélio Vieira Cabral) e toda a equipe dele
// ("Marcos Cabral", cod_equipe=7 — confirmado em 21/07/2026 via API do Ileva, 50 consultores
// nessa equipe). As próprias placas do Thiago NÃO contam (confirmado com o Samuel) — só as dos
// outros, para não duplicar comissão sobre o próprio trabalho dele.
//
// Depende de quem JÁ TEM apuração gerada nesse mês/ano (mesma limitação "sob demanda" do resto
// do sistema, igual ao "Total Equipe" em web/src/lib/apuracao/equipe.ts) — se a apuração do
// Thiago for gerada ANTES da dos outros consultores, o valor sai subestimado (não é recalculado
// automaticamente depois). Recomendação operacional: gerar a apuração do Thiago por último,
// depois do lote completo do mês (ver seção 6.6 do CONTEXTO_E_CHECKLIST.md).
export const COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS = 302
export const COD_EQUIPE_EXCLUIDA_COMISSAO_GERENCIAL = 7 // equipe "Marcos Cabral" (consultor #19)
// Equipe separada da acima no próprio Ileva (cod_equipe próprio, 16 consultores — confirmado
// 29/08/2026 via API real), mas da mesma "família" Marcos Cabral. Pedido do cliente
// (29/08/2026): a partir da competência 08/2026 ela PASSA a contar na comissão do Thiago — só a
// equipe "Marcos Cabral" pura (COD_EQUIPE_EXCLUIDA_COMISSAO_GERENCIAL) continua de fora. Em
// competências anteriores a agosto/2026 as duas continuam excluídas juntas (mesma regra de
// sempre) — não é recalculado retroativamente.
export const COD_EQUIPE_SENADOR_CANEDO = 13
const COMPETENCIA_INCLUI_SENADOR_CANEDO = { ano: 2026, mes: 8 }
export const VALOR_COMISSAO_GERENCIAL_POR_PLACA = 2

function equipesExcluidasComissaoGerencial(ano: number, mes: number): number[] {
  const antesDoCorte =
    ano < COMPETENCIA_INCLUI_SENADOR_CANEDO.ano ||
    (ano === COMPETENCIA_INCLUI_SENADOR_CANEDO.ano && mes < COMPETENCIA_INCLUI_SENADOR_CANEDO.mes)
  return antesDoCorte
    ? [COD_EQUIPE_EXCLUIDA_COMISSAO_GERENCIAL, COD_EQUIPE_SENADOR_CANEDO]
    : [COD_EQUIPE_EXCLUIDA_COMISSAO_GERENCIAL]
}

export interface ItemComissaoGerencialPlaca {
  cod_consultor: number
  nomeConsultor: string
  quantidadePlacas: number
  valor: number
}

export interface ComissaoGerencialPlacas {
  totalPlacas: number
  valorTotal: number
  itens: ItemComissaoGerencialPlaca[]
}

interface ApuracaoRowParaComissao {
  cod_consultor: number
  detalhe: { nomeConsultor?: string; placasAtivadas?: unknown[] } | null
}

export async function calcularComissaoGerencialPlacas(
  ano: number,
  mes: number
): Promise<ComissaoGerencialPlacas> {
  const admin = createSupabaseAdminClient()
  const excluidas = equipesExcluidasComissaoGerencial(ano, mes)
  const { data } = await admin
    .from('apuracoes_mensais')
    .select('cod_consultor, detalhe')
    .eq('ano', ano)
    .eq('mes', mes)
    .neq('cod_consultor', COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS)
    .not('cod_equipe', 'in', `(${excluidas.join(',')})`)

  const itens: ItemComissaoGerencialPlaca[] = ((data ?? []) as ApuracaoRowParaComissao[])
    .map((row) => {
      const quantidadePlacas = row.detalhe?.placasAtivadas?.length ?? 0
      return {
        cod_consultor: row.cod_consultor,
        nomeConsultor: row.detalhe?.nomeConsultor ?? `Consultor #${row.cod_consultor}`,
        quantidadePlacas,
        valor: quantidadePlacas * VALOR_COMISSAO_GERENCIAL_POR_PLACA,
      }
    })
    .filter((item) => item.quantidadePlacas > 0)
    .sort((a, b) => b.quantidadePlacas - a.quantidadePlacas)

  const totalPlacas = itens.reduce((soma, item) => soma + item.quantidadePlacas, 0)

  return {
    totalPlacas,
    valorTotal: totalPlacas * VALOR_COMISSAO_GERENCIAL_POR_PLACA,
    itens,
  }
}
