// Bônus por Performance do plano de carreira — "Ganhos e Incentivos" (PDF enviado pelo cliente,
// docs/GANHOS E INCETIVOS CORRETO ATUALIZADO.pdf, 26/07/2026). Substitui a regra antiga sem
// faixas definidas (CONTEXTO_E_CHECKLIST.md seção 6.6/6.1) — confirmado com o cliente que este
// documento é a fonte de verdade atual, mesmo divergindo do exemplo antigo do Power BI
// (19 adesões → R$1.150, calculado antes desta regra existir).
//
// Regra (texto literal do PDF, página 3): "Bateu 10 adesões? Você libera um bônus de R$50 por
// placa — nas que já fez e em todas as próximas do mês atual." Ou seja: é um gatilho de tudo-ou-
// nada por mês — abaixo de 10 adesões pagas no mês, nenhum bônus; a partir de 10 (inclusive),
// TODAS as adesões daquele mês (não só as que passarem de 10) rendem R$50 cada.
//
// "Placa" aqui é a mesma contagem de "adesão paga" já usada pra `totalAdesao` em mensal.ts (1
// boleto tipo "Adesão" liquidado = 1 veículo/placa) — não a contagem de "Placas Ativadas"
// (dt_contrato), que é uma métrica operacional diferente e não entra em comissão (ver nota em
// mensal.ts sobre ativação vs. pagamento).
//
// Ainda NÃO cobre "premiação de equipe" nem "níveis" do plano de carreira — o PDF não define
// nenhum dos dois; `total_premiacao_equipe` continua 0 até o cliente detalhar essa parte.
export const LIMITE_ADESOES_BONUS_PERFORMANCE = 10
export const VALOR_BONUS_PERFORMANCE_POR_PLACA = 50

export interface PremiacaoIndividual {
  elegivel: boolean
  quantidadeAdesoes: number
  valorPorPlaca: number
  valorTotal: number
}

export function calcularPremiacaoIndividual(quantidadeAdesoesPagas: number): PremiacaoIndividual {
  const elegivel = quantidadeAdesoesPagas >= LIMITE_ADESOES_BONUS_PERFORMANCE
  return {
    elegivel,
    quantidadeAdesoes: quantidadeAdesoesPagas,
    valorPorPlaca: VALOR_BONUS_PERFORMANCE_POR_PLACA,
    valorTotal: elegivel ? quantidadeAdesoesPagas * VALOR_BONUS_PERFORMANCE_POR_PLACA : 0,
  }
}
