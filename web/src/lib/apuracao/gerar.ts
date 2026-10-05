import { apurarConsultorMes } from './mensal'
import {
  calcularBonusNivel,
  CONSULTORES_SEM_BONUS_NIVEL,
  EQUIPES_SEM_BONUS_NIVEL,
  LIDERES_DE_EQUIPE,
  type BonusNivel,
} from './bonus-nivel'
import { totalPlacasAtivadasColegasEquipe } from './equipe'
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
  totalBonusNivel: number
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

  const admin = createSupabaseAdminClient()

  // Exclusões manuais de desconto de rastreador (Gestor decide não cobrar de propósito, ver
  // gestor/consultor/[cod]/rastreadores/actions.ts) — aplicadas por cima do cálculo puro da
  // Ileva. mensal.ts nunca sabe dessa exceção (sempre recalcula o desconto completo), então isso
  // sobrevive a qualquer regeração futura.
  const { data: exclusoes } = await admin.from('rastreador_exclusoes').select('cod_veiculo')
  const codVeiculosExcluidos = new Set((exclusoes ?? []).map((e) => e.cod_veiculo))
  const descontosRastreador = resultado.descontosRastreador.filter((d) => !codVeiculosExcluidos.has(d.cod_veiculo))
  const totalDescontoRastreador = descontosRastreador.reduce((soma, item) => soma + item.valor, 0)

  // Só calcula pro consultor #302 (Thiago, gerente) — pra todo mundo mais isso é uma query a
  // menos no Supabase, sem custo nenhum. Ver comissao-gerencial.ts pra regra completa.
  const comissaoGerencial =
    codConsultor === COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS
      ? await calcularComissaoGerencialPlacas(ano, mes)
      : null

  // Bônus por Performance (R$50/placa a partir de 10 placas ativadas no mês — trocado de
  // "adesões pagas" pra "placas ativadas" em 07/08/2026, a pedido do cliente) — ver
  // premiacao-individual.ts pra regra completa e a fonte (PDF "Ganhos e Incentivos" do cliente).
  const premiacaoIndividual = calcularPremiacaoIndividual(resultado.placasAtivadas.length)

  // Bônus por Nível do plano de carreira (placas ativadas no mês, não adesões pagas) — ver
  // bonus-nivel.ts pra regra completa e a fonte (PDF "Plano de Carreira Protegeclub", 05/08/2026).
  // Líder de equipe (ex.: Lara #296, Equipe Alfa): o nível conta as placas da equipe inteira.
  const equipeDoLider = LIDERES_DE_EQUIPE[codConsultor]
  const lideraEstaEquipe = equipeDoLider !== undefined && resultado.codEquipe === equipeDoLider
  const placasDosColegas = lideraEstaEquipe
    ? await totalPlacasAtivadasColegasEquipe(equipeDoLider, codConsultor, ano, mes)
    : 0
  const bonusNivelCalculado: BonusNivel = lideraEstaEquipe
    ? {
        ...calcularBonusNivel(resultado.placasAtivadas.length + placasDosColegas),
        baseEquipe: true,
        qtdPlacasIndividuais: resultado.placasAtivadas.length,
      }
    : calcularBonusNivel(resultado.placasAtivadas.length)
  // Consultores/equipes que não recebem o bônus em R$ (Marcos Cabral #19 e a equipe "Marcos Cabral
  // - Senador Canedo") — ver bonus-nivel.ts.
  const semBonusNivel =
    CONSULTORES_SEM_BONUS_NIVEL.includes(codConsultor) ||
    (resultado.codEquipe != null && EQUIPES_SEM_BONUS_NIVEL.includes(resultado.codEquipe))
  const bonusNivel: BonusNivel = semBonusNivel
    ? { ...bonusNivelCalculado, patamarAtingido: null, valor: 0, semBonus: true }
    : bonusNivelCalculado

  const totalLiquido =
    resultado.totalAdesao +
    resultado.totalRecorrencia -
    totalDescontoRastreador +
    premiacaoIndividual.valorTotal +
    bonusNivel.valor +
    (comissaoGerencial?.valorTotal ?? 0)

  const { error } = await admin.from('apuracoes_mensais').upsert(
    {
      cod_consultor: codConsultor,
      cod_equipe: resultado.codEquipe,
      ano,
      mes,
      total_adesao: resultado.totalAdesao,
      total_recorrencia: resultado.totalRecorrencia,
      total_desconto_rastreador: totalDescontoRastreador,
      total_premiacao_individual: premiacaoIndividual.valorTotal,
      total_premiacao_equipe: 0,
      total_bonus_nivel: bonusNivel.valor,
      total_comissao_gerencial: comissaoGerencial?.valorTotal ?? 0,
      total_liquido: totalLiquido,
      gerado_por: geradoPorUserId,
      gerado_em: new Date().toISOString(),
      detalhe: {
        nomeConsultor: resultado.nomeConsultor,
        adesoes: resultado.adesoes,
        recorrencias: resultado.recorrencias,
        veiculosComRastreador: resultado.veiculosComRastreador,
        descontosRastreador,
        placasAtivadas: resultado.placasAtivadas,
        inadimplentes: resultado.inadimplentes,
        totalRecorrenciaEstimadaInadimplentes: resultado.totalRecorrenciaEstimadaInadimplentes,
        premiacaoIndividual,
        bonusNivel,
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
    totalDescontoRastreador,
    totalPremiacaoIndividual: premiacaoIndividual.valorTotal,
    totalBonusNivel: bonusNivel.valor,
    totalLiquido,
  }
}
