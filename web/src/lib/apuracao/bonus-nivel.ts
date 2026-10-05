// Bônus por Nível do plano de carreira — "Plano de Carreira Protegeclub.pdf" (enviado pelo
// cliente, 05/08/2026). Reverte a decisão anterior de "sem níveis" (30/07/2026,
// CONTEXTO_E_CHECKLIST.md seção 6.1/6.6) — o cliente trouxe essa regra numa reunião nova.
//
// Duas escalas INDEPENDENTES, ambas usando a contagem de "placas ativadas no mês" (mesma
// métrica de `dt_contrato` já usada na aba Placas Ativadas — é o veículo cujo contrato começou
// naquele mês, não a "adesão paga" — confirmado com o Samuel em 05/08/2026):
//
// 1. Bônus por Nível (R$, soma na comissão líquida): tabela de patamares do PDF. Paga o valor do
//    MAIOR patamar atingido (não soma os patamares menores). Abaixo do primeiro patamar (15
//    placas), o bônus é R$0.
//    **Corrigido em 05/10/2026**: o 1º patamar estava como 25 placas, mas a tabela do plano
//    (imagem enviada pelo cliente: números azuis = placas ativadas, brancos = R$) começa em
//    15 placas → R$600. Os demais degraus já conferiam. Afetou, em set/2026, #303, #261, #317 e
//    #19 (15 a 24 placas, bônus R$0 em vez de R$600).
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
  { placas: 15, valor: 600 },
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

// Líderes de equipe: o bônus por nível e o nível de gestão deles contam as placas ativadas da
// EQUIPE inteira (as do próprio líder + as dos colegas da mesma `cod_equipe`), não só as
// individuais. Confirmado pelo Samuel em 05/10/2026 para a Lara (#296), líder da Equipe Alfa
// (`cod_equipe` 24). O mapa é `cod_consultor → cod_equipe`; a equipe é conferida contra a do
// Ileva na hora de gerar, então se o líder trocar de equipe o bônus volta a ser individual.
// A premiação individual (R$50/placa a partir de 10) continua usando só as placas do próprio.
export const LIDERES_DE_EQUIPE: Readonly<Record<number, number>> = {
  296: 24, // Lara — Equipe Alfa
}

// Consultores que NÃO recebem o bônus por nível em R$ (o título de gestão continua sendo exibido).
// Confirmado pelo Samuel em 05/10/2026: Marcos Cabral (#19) não recebe esse bônus. Atenção: nos
// meses 07/2026 e 08/2026 o #19 recebeu R$600 por mês desse bônus (já enviados à Omie) — os dois
// meses foram gerados antes desta regra existir.
export const CONSULTORES_SEM_BONUS_NIVEL: readonly number[] = [19]
// Equipes inteiras sem o bônus por nível em R$. Confirmado pelo Samuel em 05/10/2026: nenhum
// consultor da equipe "Marcos Cabral - Senador Canedo" (cod_equipe 13, a mesma de
// COD_EQUIPE_SENADOR_CANEDO em comissao-gerencial.ts) recebe esse bônus. A equipe é a do Ileva no
// momento da geração. Em set/2026 o #261 e o #317 (equipe 13) chegaram a ser gerados com R$600
// antes desta regra — foram regerados sem o bônus; nunca houve envio à Omie com ele.
export const EQUIPES_SEM_BONUS_NIVEL: readonly number[] = [13]

export interface BonusNivel {
  // Só presente quando o consultor está em CONSULTORES_SEM_BONUS_NIVEL: valor fica R$0.
  semBonus?: boolean
  // Quantidade usada pra achar o patamar: as placas da equipe inteira quando `baseEquipe`, senão
  // as individuais.
  qtdPlacasAtivadas: number
  patamarAtingido: number | null
  valor: number
  // Só presentes na apuração de líder de equipe (ver LIDERES_DE_EQUIPE).
  baseEquipe?: boolean
  qtdPlacasIndividuais?: number
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
