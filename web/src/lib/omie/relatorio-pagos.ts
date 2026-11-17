import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buscarVinculosConfirmados } from './vinculo'

// Relatório de consultores pagos via Omie (pedido do cliente, 17/11/2026). "Pago" aqui = título a
// pagar criado com sucesso no Omie pelo sistema (auditoria_omie.status = 'enviado'). O sistema não
// consulta a baixa/liquidação do título no Omie — só sabe que o título foi lançado lá. Títulos
// estornados ficam de fora (o dinheiro não foi pra ninguém); tentativas com erro idem.
export interface PagamentoOmie {
  cod_consultor: number
  nomeConsultor: string
  ano: number
  mes: number
  valor: number
  registradoEm: string // ISO — data em que o sistema registrou a tentativa de envio (auditoria_omie.criado_em)
  fornecedorOmie: string | null
  chavePix: string | null
  anexoStatus: 'nao_tentado' | 'enviado' | 'erro'
}

export interface ResumoConsultorPago {
  cod_consultor: number
  nomeConsultor: string
  qtdTitulos: number
  total: number
}

export interface RelatorioPagosOmie {
  pagamentos: PagamentoOmie[]
  porConsultor: ResumoConsultorPago[]
  totalPago: number
  qtdConsultores: number
  // Quantos títulos já foram estornados no mesmo recorte — só informativo, pra o Gestor saber que
  // existe diferença entre "enviados alguma vez" e "valem hoje".
  qtdEstornados: number
}

interface LinhaAuditoria {
  cod_consultor: number
  valor: number
  status: string
  criado_em: string
  anexo_status: PagamentoOmie['anexoStatus']
  apuracoes_mensais: { ano: number; mes: number; detalhe: { nomeConsultor?: string } | null } | null
}

// Período por data (AAAA-MM-DD, inclusive nas duas pontas) em que o título foi registrado no
// sistema/enviado ao Omie — pedido do cliente (17/11/2026): escolher as datas e retirar o relatório.
// Ambos opcionais; sem nenhum, traz todo o histórico.
export interface FiltroPagosOmie {
  de?: string
  ate?: string
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

export function normalizarDataFiltro(valor: string | null | undefined): string | undefined {
  return valor && DATA_ISO.test(valor) ? valor : undefined
}

// Data (AAAA-MM-DD) no fuso de Brasília — um envio às 22h de dia 31 não pode "virar" dia 1 por
// causa do UTC do servidor.
function dataLocalIso(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export async function buscarRelatorioPagosOmie(filtro: FiltroPagosOmie = {}): Promise<RelatorioPagosOmie> {
  const admin = createSupabaseAdminClient()

  const [{ data, error }, vinculos] = await Promise.all([
    admin
      .from('auditoria_omie')
      .select('cod_consultor, valor, status, criado_em, anexo_status, apuracoes_mensais(ano, mes, detalhe)')
      .in('status', ['enviado', 'estornado'])
      .order('criado_em', { ascending: false })
      .limit(5000),
    buscarVinculosConfirmados(),
  ])

  if (error) throw new Error(`Erro ao buscar pagamentos do Omie: ${error.message}`)

  const linhas = ((data ?? []) as unknown as LinhaAuditoria[]).filter((l) => {
    if (!l.apuracoes_mensais) return false
    const dia = dataLocalIso(l.criado_em)
    if (filtro.de && dia < filtro.de) return false
    if (filtro.ate && dia > filtro.ate) return false
    return true
  })

  const pagamentos: PagamentoOmie[] = linhas
    .filter((l) => l.status === 'enviado')
    .map((l) => {
      const ap = l.apuracoes_mensais!
      const vinculo = vinculos.get(l.cod_consultor)
      return {
        cod_consultor: l.cod_consultor,
        // O Ileva devolve o nome com espaço sobrando no fim.
        nomeConsultor: ap.detalhe?.nomeConsultor?.trim() || `Consultor #${l.cod_consultor}`,
        ano: ap.ano,
        mes: ap.mes,
        valor: Number(l.valor),
        registradoEm: l.criado_em,
        fornecedorOmie: vinculo?.nome_omie ?? null,
        chavePix: vinculo?.chave_pix ?? null,
        anexoStatus: l.anexo_status,
      }
    })
    // Competência mais recente primeiro; dentro dela, maior valor primeiro.
    .sort((a, b) => b.ano - a.ano || b.mes - a.mes || b.valor - a.valor)

  const mapa = new Map<number, ResumoConsultorPago>()
  for (const p of pagamentos) {
    const atual = mapa.get(p.cod_consultor) ?? {
      cod_consultor: p.cod_consultor,
      nomeConsultor: p.nomeConsultor,
      qtdTitulos: 0,
      total: 0,
    }
    atual.qtdTitulos += 1
    atual.total += p.valor
    mapa.set(p.cod_consultor, atual)
  }

  return {
    pagamentos,
    porConsultor: [...mapa.values()].sort((a, b) => b.total - a.total),
    totalPago: pagamentos.reduce((soma, p) => soma + p.valor, 0),
    qtdConsultores: mapa.size,
    qtdEstornados: linhas.filter((l) => l.status === 'estornado').length,
  }
}

// CSV pro Excel brasileiro: separador ';', vírgula decimal e BOM UTF-8 (sem o BOM o Excel
// estraga os acentos). Campos com ; " ou quebra de linha vão entre aspas.
function campoCsv(valor: string | number): string {
  const texto = String(valor)
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsvPagosOmie(pagamentos: PagamentoOmie[]): string {
  const cabecalho = ['Cód. consultor', 'Consultor', 'Competência', 'Valor (R$)', 'Registrado em', 'Fornecedor Omie', 'Chave PIX']
  const linhas = pagamentos.map((p) => [
    p.cod_consultor,
    p.nomeConsultor,
    `${String(p.mes).padStart(2, '0')}/${p.ano}`,
    p.valor.toFixed(2).replace('.', ','),
    new Date(p.registradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    p.fornecedorOmie ?? '',
    p.chavePix ?? '',
  ])
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(campoCsv).join(';')).join('\r\n')
}
