import { ilevaGet } from '@/lib/ileva/client'
import type { BoletoDetalhe, BoletoResumo, Consultor, SituacaoBoleto, Veiculo } from '@/types/domain'

// A API do Ileva retorna 400 ("Por favor informe o início da paginação") se
// inicio_paginacao/quantidade_por_pagina não forem enviados — por isso são obrigatórios aqui,
// mesmo a API tratando como opcionais na doc.
interface Paginacao {
  inicio_paginacao: number
  quantidade_por_pagina: number
}

export async function listarConsultores(
  params: Paginacao & {
    cod_regional?: number
    cod_equipe?: number
  }
): Promise<{ total_encontrados: number; consultores: Consultor[] }> {
  return ilevaGet('/consultor/listar', { ...params })
}

export async function listarVeiculos(
  params: Paginacao & {
    cod_consultor?: number
    possui_rastreador?: 0 | 1 // atenção: inteiro na query, string "Sim"/"Não" só na resposta
    mostrar_beneficios?: 0 | 1
    cod_situacao?: number
  }
): Promise<{ total_encontrados: number; veiculos: Veiculo[] }> {
  return ilevaGet('/veiculo/listar', { ...params })
}

export async function listarCobrancasPorVeiculo(
  params: Paginacao & {
    cod_veiculo?: number
    cod_associado?: number
    situacao_boleto?: SituacaoBoleto
    dt_pagamento_de?: string // formato YYYY-MM-DD
    dt_pagamento_ate?: string
    dt_vencimento_de?: string
    dt_vencimento_ate?: string
  }
): Promise<{ total_encontrados: number; boletos: BoletoResumo[] }> {
  return ilevaGet('/cobranca/listar-associado-veiculo', { ...params })
}

export async function buscarCobranca(params: {
  cod_cobranca: number
}): Promise<{ boleto: BoletoDetalhe }> {
  return ilevaGet('/cobranca/buscar', { ...params })
}

export async function listarBeneficios(params: Paginacao) {
  return ilevaGet<{
    total_encontrados: number
    beneficios: { cod_beneficio: number; nome: string; calculo: string; valor: string }[]
  }>('/beneficio', { ...params })
}
