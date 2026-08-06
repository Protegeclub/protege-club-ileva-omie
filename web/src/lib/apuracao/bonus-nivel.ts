// Bônus por Nível do plano de carreira — "Plano de Carreira Protegeclub.pdf" (enviado pelo
// cliente, 05/08/2026). Reverte a decisão anterior de "sem níveis" (30/07/2026,
// CONTEXTO_E_CHECKLIST.md seção 6.1/6.6) — o cliente trouxe essa regra numa reunião nova.
//
// Duas escalas INDEPENDENTES, ambas usando a contagem de "placas ativadas no mês" (mesma
// métrica de `dt_contrato` já usada na aba Placas Ativadas — é o veículo cujo contrato começou
// naquele mês, não a "adesão paga" — confirmado com o Samuel em 05/08/2026):
//
// 1. Bônus por Nível (R$, soma na comissão líquida): tabela de patamares do PDF. Paga o valor do
//    MAIOR patamar atingido (não soma os patamares menores). Abaixo do primeiro patamar (25
//    placas), o bônus é R$0.
// 2. Nível de gestão (só título/tag de exibição, não afeta nenhum valor em R$): os 8 nomes do
//    PDF (Líder Júnior → Gestor Master), cada um com seu próprio patamar de placas ativadas.
//    Os patamares NÃO batem com os do bônus em R$ acima (ex.: 100 placas ainda é "Coordenador",
//    igual a 90, mas o bônus já sobe de R$3.600 pra R$4.500) — confirmado com o Samuel que são
//    escalas independentes, não é erro.
export interface PatamarBonusNivel {
  placas: number
  valor: number
}

export const PATAMARES_BONUS_NIVEL: readonly PatamarBonusNivel[] = [
  { placas: 25, valor: 600 },
  { placas: 30, valor: 1200 },
  { placas: 45, valor: 1800 },
  { placas: 60, valor: 2400 },
  { placas: 90, valor: 3600 },
  { placas: 120, valor: 4500 },
  { placas: 150, valor: 5100 },
  { placas: 180, valor: 6000 },
  { placas: 210, valor: 6600 },
  { placas: 240, valor: 7500 },
  { placas: 270, valor: 8820 },
  { placas: 300, valor: 9600 },
  { placas: 360, valor: 11400 },
  { placas: 420, valor: 12600 },
  { placas: 480, valor: 13800 },
  { placas: 540, valor: 15000 },
  { placas: 600, valor: 16200 },
  { placas: 660, valor: 17400 },
  { placas: 720, valor: 18600 },
]

export interface PatamarNivelGestao {
  placas: number
  titulo: string
}

export const NIVEIS_GESTAO: readonly PatamarNivelGestao[] = [
  { placas: 15, titulo: 'Líder Júnior' },
  { placas: 30, titulo: 'Líder' },
  { placas: 45, titulo: 'Líder Senior' },
  { placas: 60, titulo: 'Líder Master' },
  { placas: 90, titulo: 'Coordenador' },
  { placas: 240, titulo: 'Gerente' },
  { placas: 360, titulo: 'Gestor Senior' },
  { placas: 720, titulo: 'Gestor Master' },
]

function maiorPatamarAtingido<T extends { placas: number }>(
  patamares: readonly T[],
  qtdPlacasAtivadas: number
): T | null {
  const atingidos = patamares.filter((p) => qtdPlacasAtivadas >= p.placas)
  return atingidos.length > 0 ? atingidos[atingidos.length - 1] : null
}

export interface BonusNivel {
  qtdPlacasAtivadas: number
  patamarAtingido: number | null
  valor: number
}

export function calcularBonusNivel(qtdPlacasAtivadas: number): BonusNivel {
  const patamar = maiorPatamarAtingido(PATAMARES_BONUS_NIVEL, qtdPlacasAtivadas)
  return {
    qtdPlacasAtivadas,
    patamarAtingido: patamar?.placas ?? null,
    valor: patamar?.valor ?? 0,
  }
}

export function calcularNivelGestao(qtdPlacasAtivadas: number): PatamarNivelGestao | null {
  return maiorPatamarAtingido(NIVEIS_GESTAO, qtdPlacasAtivadas)
}
