// Bônus por Performance do plano de carreira — "Ganhos e Incentivos" (PDF enviado pelo cliente,
// docs/GANHOS E INCETIVOS CORRETO ATUALIZADO.pdf, 26/07/2026). Substitui a regra antiga sem
// faixas definidas (CONTEXTO_E_CHECKLIST.md seção 6.6/6.1) — confirmado com o cliente que este
// documento é a fonte de verdade atual, mesmo divergindo do exemplo antigo do Power BI
// (19 adesões → R$1.150, calculado antes desta regra existir).
//
// Regra (texto literal do PDF, página 3): "Bateu 10 adesões? Você libera um bônus de R$50 por
// placa — nas que já fez e em todas as próximas do mês atual." Ou seja: é um gatilho de tudo-ou-
// nada por mês — abaixo de 10, nenhum bônus; a partir de 10 (inclusive), TODAS as placas daquele
// mês (não só as que passarem de 10) rendem R$50 cada.
//
// ~~"Placa" aqui é a mesma contagem de "adesão paga"~~ — **corrigido em 07/08/2026, a pedido do
// cliente**: a contagem (o "10" do gatilho e o multiplicador do R$50) passou a ser por **placas
// ativadas no mês** (`dt_contrato` dentro do mês — mesma métrica de `placasAtivadas` em
// mensal.ts), não mais por adesão paga. As duas métricas divergem na prática (ex.: consultor #19
// teve 20 adesões pagas vs. 28 placas ativadas em julho/2026) — essa mudança troca qual delas
// vale pra esse bônus específico.
export const LIMITE_PLACAS_BONUS_PERFORMANCE = 10
export const VALOR_BONUS_PERFORMANCE_POR_PLACA = 50

export interface PremiacaoIndividual {
  elegivel: boolean
  quantidadePlacasAtivadas: number
  valorPorPlaca: number
  valorTotal: number
}

export function calcularPremiacaoIndividual(quantidadePlacasAtivadas: number): PremiacaoIndividual {
  const elegivel = quantidadePlacasAtivadas >= LIMITE_PLACAS_BONUS_PERFORMANCE
  return {
    elegivel,
    quantidadePlacasAtivadas,
    valorPorPlaca: VALOR_BONUS_PERFORMANCE_POR_PLACA,
    valorTotal: elegivel ? quantidadePlacasAtivadas * VALOR_BONUS_PERFORMANCE_POR_PLACA : 0,
  }
}
