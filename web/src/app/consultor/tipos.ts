import type { ComissaoGerencialPlacas } from '@/lib/apuracao/comissao-gerencial'
import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  PlacaAtivadaItem,
  RecorrenciaItem,
  VeiculoRastreadorItem,
} from '@/lib/apuracao/mensal'
import type { PremiacaoIndividual } from '@/lib/apuracao/premiacao-individual'
import type { BonusNivel } from '@/lib/apuracao/bonus-nivel'

// Formato de `apuracoes_mensais.detalhe` (JSONB) gravado por web/src/app/gestor/gerar/actions.ts.
export interface ApuracaoDetalhe {
  nomeConsultor?: string
  adesoes?: AdesaoItem[]
  recorrencias?: RecorrenciaItem[]
  veiculosComRastreador?: VeiculoRastreadorItem[]
  descontosRastreador?: DescontoRastreadorItem[]
  placasAtivadas?: PlacaAtivadaItem[]
  inadimplentes?: InadimplenteItem[]
  totalRecorrenciaEstimadaInadimplentes?: number
  // Bônus por Performance (R$50/placa a partir de 10 adesões/mês) — ver
  // lib/apuracao/premiacao-individual.ts.
  premiacaoIndividual?: PremiacaoIndividual
  // Só presente na apuração do consultor #302 (Thiago) — ver lib/apuracao/comissao-gerencial.ts.
  comissaoGerencialPlacas?: ComissaoGerencialPlacas
  // Bônus por Nível do plano de carreira (placas ativadas no mês) — ver
  // lib/apuracao/bonus-nivel.ts.
  bonusNivel?: BonusNivel
}

export interface ApuracaoRow {
  ano: number
  mes: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_premiacao_individual: number
  total_premiacao_equipe: number
  total_comissao_gerencial: number
  total_bonus_nivel: number
  total_liquido: number
  cod_equipe: number | null
  gerado_em: string
  detalhe: ApuracaoDetalhe
}

// Único lugar que soma os componentes do "Total a receber" — usado nos dois dashboards
// (consultor e gestor/consultor/[cod]) pra não arriscar a fórmula divergir entre os dois.
export function calcularTotalReceber(linha: ApuracaoRow): number {
  return (
    linha.total_adesao +
    linha.total_recorrencia -
    linha.total_desconto_rastreador +
    linha.total_premiacao_individual +
    linha.total_premiacao_equipe +
    linha.total_comissao_gerencial +
    linha.total_bonus_nivel
  )
}

// Junta os itens de todas as linhas (própria + equipe, quando o toggle está ligado) — cada item
// já carrega `consultorNome`, então dá pra distinguir de quem é cada linha na tabela.
export function juntarItens<K extends keyof ApuracaoDetalhe>(
  linhas: ApuracaoRow[],
  chave: K
): NonNullable<ApuracaoDetalhe[K]> extends (infer Item)[] ? Item[] : never {
  return linhas.flatMap((l) => (l.detalhe?.[chave] as unknown[]) ?? []) as never
}

export function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "AAAA-MM-DD" -> "DD/MM/AAAA". Usado nas tabelas (ex.: Recorrência) — o Ileva já manda a data
// nesse formato ISO, só reordena pra exibição.
export function formatarDataBr(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

// "AAAA-MM" (referência de mensalidade do Ileva, ex.: "2026-05") -> "Ref:MM/AAAA". Só controle
// visual — a contagem de recorrência é sempre pela data de pagamento, nunca pela referência.
export function formatarReferencia(referencia: string | null): string {
  if (!referencia) return '—'
  const [ano, mes] = referencia.split('-')
  return `Ref:${mes}/${ano}`
}

export type TipoMovimentacao = 'adesao' | 'recorrencia' | 'desconto' | 'placa'

export interface ItemTimeline {
  tipo: TipoMovimentacao
  titulo: string
  descricao: string
  valor: number
  data: string
}

const TITULOS_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  adesao: 'Nova adesão',
  recorrencia: 'Pagamento de recorrência',
  desconto: 'Desconto de rastreador aplicado',
  placa: 'Placa ativada',
}

// Monta a "timeline de movimentações" só juntando e ordenando o que já está calculado em
// detalhe (adesões/recorrências/descontos/placas) por data — não soma nem recalcula nada, é
// puramente uma reapresentação cronológica do mesmo dado que os cards e o PDF já usam.
export function montarTimeline(linha: ApuracaoRow | null, limite = 8): ItemTimeline[] {
  if (!linha) return []
  const detalhe = linha.detalhe ?? {}

  const itens: ItemTimeline[] = [
    ...(detalhe.adesoes ?? [])
      .filter((a) => a.dt_pagamento)
      .map((a) => ({
        tipo: 'adesao' as const,
        titulo: TITULOS_MOVIMENTACAO.adesao,
        descricao: `${a.associado} · placa ${a.placa}`,
        valor: a.valor,
        data: a.dt_pagamento as string,
      })),
    ...(detalhe.recorrencias ?? [])
      .filter((r) => r.dt_pagamento)
      .map((r) => ({
        tipo: 'recorrencia' as const,
        titulo: TITULOS_MOVIMENTACAO.recorrencia,
        descricao: `${r.associado} · placa ${r.placa}`,
        valor: r.valor,
        data: r.dt_pagamento as string,
      })),
    ...(detalhe.descontosRastreador ?? []).map((d) => ({
      tipo: 'desconto' as const,
      titulo: TITULOS_MOVIMENTACAO.desconto,
      descricao: `${d.associado} · placa ${d.placa}`,
      valor: d.valor,
      data: d.dt_contrato,
    })),
    ...(detalhe.placasAtivadas ?? []).map((p) => ({
      tipo: 'placa' as const,
      titulo: TITULOS_MOVIMENTACAO.placa,
      descricao: `${p.associado} · placa ${p.placa}`,
      valor: 0,
      data: p.dt_contrato,
    })),
  ]

  return itens.sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite)
}

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const NOMES_MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Mesmo mês do ano anterior (com virada de ano em janeiro) — usado tanto pra buscar o período
// anterior (comparação dos KPIs) quanto pra montar os últimos N meses do histórico.
export function periodoAnterior(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}

export interface PontoEvolucaoConsultor {
  rotulo: string
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalBonusNivel: number
  totalPremiacaoIndividual: number
  totalLiquido: number
  qtdAdesoes: number
}

// Linha crua de apuracoes_mensais só com os campos usados no histórico (select enxuto, sem
// `detalhe` inteiro, pra não puxar adesões/recorrências de 6 meses à toa).
export interface LinhaEvolucaoRow {
  mes: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_bonus_nivel: number
  total_premiacao_individual: number
  total_liquido: number
  detalhe: { adesoes?: unknown[] } | null
}

// Transforma as linhas já buscadas (uma por período, mais antiga primeiro) no formato que os
// gráficos usam — só remapeia campos e calcula o rótulo, não soma nem recalcula nada de negócio.
export function montarEvolucao(
  periodos: { ano: number; mes: number }[],
  linhasPorPeriodo: (LinhaEvolucaoRow | null)[]
): PontoEvolucaoConsultor[] {
  return periodos.map(({ ano, mes }, i) => {
    const linha = linhasPorPeriodo[i]
    return {
      rotulo: `${NOMES_MESES_ABREV[mes - 1]}/${String(ano).slice(2)}`,
      totalAdesao: linha?.total_adesao ?? 0,
      totalRecorrencia: linha?.total_recorrencia ?? 0,
      totalDescontoRastreador: linha?.total_desconto_rastreador ?? 0,
      totalBonusNivel: linha?.total_bonus_nivel ?? 0,
      totalPremiacaoIndividual: linha?.total_premiacao_individual ?? 0,
      totalLiquido: linha?.total_liquido ?? 0,
      qtdAdesoes: linha?.detalhe?.adesoes?.length ?? 0,
    }
  })
}
