import { ilevaGet } from '@/lib/ileva/client'
import type { BoletoDetalhe, Consultor, SituacaoBoleto, Veiculo } from '@/types/domain'

export async function listarConsultores(params: {
  inicio_paginacao?: number
  quantidade_por_pagina?: number
  cod_regional?: number
  cod_equipe?: number
}): Promise<{ total_encontrados: number; consultores: Consultor[] }> {
  return ilevaGet('/consultor/listar', params)
}

export async function listarVeiculos(params: {
  inicio_paginacao?: number
  quantidade_por_pagina?: number
  cod_consultor?: number
  possui_rastreador?: 0 | 1 // atenção: inteiro na query, string "Sim"/"Não" só na resposta
  mostrar_beneficios?: 0 | 1
  cod_situacao?: number
}): Promise<{ total_encontrados: number; veiculos: Veiculo[] }> {
  return ilevaGet('/veiculo/listar', params)
}

export async function listarCobrancasPorVeiculo(params: {
  cod_veiculo?: number
  cod_associado?: number
  situacao_boleto?: SituacaoBoleto
  inicio_paginacao?: number
  quantidade_por_pagina?: number
}) {
  return ilevaGet('/cobranca/listar-associado-veiculo', params)
}

export async function buscarCobranca(params: {
  cod_cobranca: number
}): Promise<{ boleto: BoletoDetalhe }> {
  return ilevaGet('/cobranca/buscar', params)
}

export async function listarBeneficios(params: {
  inicio_paginacao?: number
  quantidade_por_pagina?: number
}) {
  return ilevaGet<{
    total_encontrados: number
    beneficios: { cod_beneficio: number; nome: string; calculo: string; valor: string }[]
  }>('/beneficio', params)
}
