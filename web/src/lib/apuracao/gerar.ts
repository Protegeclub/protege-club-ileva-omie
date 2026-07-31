import { apurarConsultorMes } from './mensal'
import {
  calcularComissaoGerencialPlacas,
  COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS,
} from './comissao-gerencial'
import { calcularPremiacaoIndividual } from './premiacao-individual'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface ResumoGeracao {
  nomeConsultor: string
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalPremiacaoIndividual: number
  totalLiquido: number
}

// Núcleo compartilhado entre a geração individual e a geração em lote (painel Gestor → Gerar
// apuração) — mesma regra de negócio (calcular + salvar em apuracoes_mensais), um único lugar
// pra manter em vez de duplicar entre as duas Server Actions em
// web/src/app/gestor/gerar/actions.ts.
export async function gerarESalvarApuracao(
  geradoPorUserId: string,
  codConsultor: number,
  ano: number,
  mes: number
): Promise<ResumoGeracao> {
  const resultado = await apurarConsultorMes(codConsultor, ano, mes)

  // Só calcula pro consultor #302 (Thiago, gerente) — pra todo mundo mais isso é uma query a
  // menos no Supabase, sem custo nenhum. Ver comissao-gerencial.ts pra regra completa.
  const comissaoGerencial =
    codConsultor === COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS
      ? await calcularComissaoGerencialPlacas(ano, mes)
      : null

  // Bônus por Performance (R$50/placa a partir de 10 adesões pagas no mês) — ver
  // premiacao-individual.ts pra regra completa e a fonte (PDF "Ganhos e Incentivos" do cliente).
  // Não existe "premiação de equipe" nem "níveis" — confirmado pelo cliente (30/07/2026) que
  // este é o plano de carreira completo e final.
  const premiacaoIndividual = calcularPremiacaoIndividual(resultado.adesoes.length)

  const totalLiquido =
    resultado.totalAdesao +
    resultado.totalRecorrencia -
    resultado.totalDescontoRastreador +
    premiacaoIndividual.valorTotal +
    (comissaoGerencial?.valorTotal ?? 0)

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
      total_premiacao_individual: premiacaoIndividual.valorTotal,
      total_premiacao_equipe: 0,
      total_comissao_gerencial: comissaoGerencial?.valorTotal ?? 0,
      total_liquido: totalLiquido,
      gerado_por: geradoPorUserId,
      gerado_em: new Date().toISOString(),
      detalhe: {
        nomeConsultor: resultado.nomeConsultor,
        adesoes: resultado.adesoes,
        recorrencias: resultado.recorrencias,
        veiculosComRastreador: resultado.veiculosComRastreador,
        descontosRastreador: resultado.descontosRastreador,
        placasAtivadas: resultado.placasAtivadas,
        inadimplentes: resultado.inadimplentes,
        totalRecorrenciaEstimadaInadimplentes: resultado.totalRecorrenciaEstimadaInadimplentes,
        premiacaoIndividual,
        ...(comissaoGerencial ? { comissaoGerencialPlacas: comissaoGerencial } : {}),
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
    totalPremiacaoIndividual: premiacaoIndividual.valorTotal,
    totalLiquido,
  }
}
