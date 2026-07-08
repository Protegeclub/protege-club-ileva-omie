// Tipos de domínio compartilhados. Refletem os campos confirmados em
// docs/api-ileva/ENDPOINTS.md (raiz do projeto) contra a API real do Ileva.

export type Perfil = 'gestor' | 'comercial' | 'consultor'

export interface Consultor {
  cod_consultor: number
  nome: string
  email: string
  telefone: string
  cod_equipe: number
  equipe: string
  cod_regional: number
  regional: string
  situacao: 'Ativo' | 'Inativo'
}

export interface BeneficioVeiculo {
  cod_beneficio: number
  beneficio_nome: string
  beneficio_valor: string
  beneficio_calculo:
    | 'fixo'
    | 'porcentagem'
    | 'porcentagem_vlmensalidade'
    | 'dinamico'
    | 'dinamico_porcentagem_fipe'
    | 'dinamico_porcentagem_mensalidade'
    | 'porcentagem_vlmensalidade_item_plano'
    | 'dinamico_porcentagem_mensalidade_item_plano'
  beneficio_tipo: 'plano' | 'comercial'
}

export interface Veiculo {
  cod_veiculo: number
  placa: string
  cod_associado: number
  associado: string
  cod_consultor: number | null
  consultor_nome: string | null
  cod_consultor_regional: number | null
  cod_consultor_equipe: number | null
  valor_fipe: string
  valor_protegido: number | null
  possui_rastreador: 'Sim' | 'Não'
  nome_plano: string
  situacao: string
  beneficios?: BeneficioVeiculo[]
}

export type SituacaoBoleto =
  | 'Aberto'
  | 'Liquidado'
  | 'Cancelado'
  | 'Liquidado com desconto'
  | 'Excluido'
  | 'Outra'

export interface LancamentoBoletoVeiculo {
  cod_boleto_veiculo_lancamento: number
  tipo: 'beneficio' | 'tx_adm' | 'rateio' | string
  descricao: string
  cod_beneficio: number | null
  valor: string
}

export interface BoletoVeiculoDetalhe {
  cod_veiculo: number
  placa: string
  situacao: string
  valor: string
  lancamentos: LancamentoBoletoVeiculo[]
}

export interface BoletoDetalhe {
  cod_cobranca: number
  valor: string
  referencia: string
  dt_vencimento: string
  dt_pagamento: string | null
  valor_pagamento: string | null
  situacao: SituacaoBoleto
  tipo_boleto: string // "Adesão" | "Fechamento" | outros cadastrados dinamicamente
  veiculos: BoletoVeiculoDetalhe[]
}

// Códigos de benefício confirmados em produção (docs/api-ileva/ENDPOINTS.md) que representam
// a comissão de recorrência ("Assistência Profissional"). Ajustar aqui se o cliente confirmar
// outras variantes por regional/plano.
export const COD_BENEFICIO_ASSISTENCIA_PROFISSIONAL = [65, 66, 110, 121] as const

// Ponto pendente: ainda não identificamos onde o desconto de instalação do rastreador (R$100)
// é lançado no Ileva. Ver seção 7 de docs/REQUISITOS.md.

export interface ApuracaoConsultorMes {
  cod_consultor: number
  ano: number
  mes: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_premiacao_individual: number
  total_premiacao_equipe: number
  total_liquido: number
  gerado_em: string
}
