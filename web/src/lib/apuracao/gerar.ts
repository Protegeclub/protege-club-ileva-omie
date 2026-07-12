import { apurarConsultorMes } from './mensal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface ResumoGeracao {
  nomeConsultor: string
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalLiquido: number
}

// Núcleo compartilhado entre a geração individual e a geração em lote (painel Comercial) — mesma
// regra de negócio (calcular + salvar em apuracoes_mensais), um único lugar pra manter em vez de
// duplicar entre as duas Server Actions em web/src/app/comercial/actions.ts.
export async function gerarESalvarApuracao(
  geradoPorUserId: string,
  codConsultor: number,
  ano: number,
  mes: number
): Promise<ResumoGeracao> {
  const resultado = await apurarConsultorMes(codConsultor, ano, mes)

  // Premiação (individual/equipe) segue de fora: as regras do plano de carreira ainda não foram
  // definidas pelo cliente (ver CONTEXTO_E_CHECKLIST.md, seção 6.1). Gravamos 0 em vez de
  // inventar uma fórmula.
  const totalLiquido =
    resultado.totalAdesao + resultado.totalRecorrencia - resultado.totalDescontoRastreador

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('apuracoes_mensais').upsert(
    {
      cod_consultor: codConsultor,
      cod_equipe: resultado.codEquipe,
      ano,
      mes,
      total_adesao: resultado.totalAdesao,
      total_recorrencia: resultado.totalRecorrencia,
      total_desconto_rastreador: resultado.totalDescontoRastreador,
      total_premiacao_individual: 0,
      total_premiacao_equipe: 0,
      total_liquido: totalLiquido,
      gerado_por: geradoPorUserId,
      gerado_em: new Date().toISOString(),
      detalhe: {
        nomeConsultor: resultado.nomeConsultor,
        adesoes: resultado.adesoes,
        recorrencias: resultado.recorrencias,
        veiculosComRastreador: resultado.veiculosComRastreador,
        descontosRastreador: resultado.descontosRastreador,
        inadimplentes: resultado.inadimplentes,
        totalRecorrenciaEstimadaInadimplentes: resultado.totalRecorrenciaEstimadaInadimplentes,
      },
    },
    { onConflict: 'cod_consultor,ano,mes' }
  )

  if (error) {
    throw new Error(`Erro ao salvar no banco: ${error.message}`)
  }

  return {
    nomeConsultor: resultado.nomeConsultor,
    totalAdesao: resultado.totalAdesao,
    totalRecorrencia: resultado.totalRecorrencia,
    totalDescontoRastreador: resultado.totalDescontoRastreador,
    totalLiquido,
  }
}
