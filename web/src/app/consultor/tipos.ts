import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  RecorrenciaItem,
  VeiculoRastreadorItem,
} from '@/lib/apuracao/mensal'

// Formato de `apuracoes_mensais.detalhe` (JSONB) gravado por web/src/app/comercial/actions.ts.
export interface ApuracaoDetalhe {
  nomeConsultor?: string
  adesoes?: AdesaoItem[]
  recorrencias?: RecorrenciaItem[]
  veiculosComRastreador?: VeiculoRastreadorItem[]
  descontosRastreador?: DescontoRastreadorItem[]
  inadimplentes?: InadimplenteItem[]
  totalRecorrenciaEstimadaInadimplentes?: number
}

export interface ApuracaoRow {
  ano: number
  mes: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_premiacao_individual: number
  total_premiacao_equipe: number
  total_liquido: number
  cod_equipe: number | null
  gerado_em: string
  detalhe: ApuracaoDetalhe
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

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
