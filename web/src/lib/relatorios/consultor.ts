import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  PlacaAtivadaItem,
  RecorrenciaItem,
} from '@/lib/apuracao/mensal'
import { AZUL, CINZA, MARGEM, criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape, type ColunaTabela } from './pdf-utils'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function periodo(ano: number, mes: number) {
  return `Referência: ${NOMES_MESES[mes - 1]}/${ano}`
}

function formatarDataBr(iso: string | null) {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarReferenciaMensalidade(referencia: string | null) {
  if (!referencia) return '—'
  const [ano, mes] = referencia.split('-')
  return `Ref:${mes}/${ano}`
}

function formatarCodCobranca(cod: number | null | undefined) {
  return cod != null ? String(cod) : '—'
}

// Adesão e Recorrência têm exatamente o mesmo formato de item (boleto real por trás: data de
// pagamento, referência da mensalidade, código do boleto) — mesmas colunas nos dois relatórios,
// só o rótulo/cor do PDF muda. Genérico via `extends` em vez de duplicar a definição duas vezes.
interface ItemComBoleto {
  dt_pagamento: string | null
  referencia: string | null
  cod_cobranca: number
  associado: string
  placa: string
  consultorNome: string
  valor: number
}

function colunasBoleto<T extends ItemComBoleto>(): ColunaTabela<T>[] {
  return [
    { titulo: 'Data Pagamento', largura: 75, valor: (i) => formatarDataBr(i.dt_pagamento) },
    { titulo: 'Referência', largura: 65, valor: (i) => formatarReferenciaMensalidade(i.referencia) },
    { titulo: 'Cód. Boleto', largura: 65, valor: (i) => formatarCodCobranca(i.cod_cobranca) },
    { titulo: 'Associado', largura: 220, valor: (i) => i.associado },
    { titulo: 'Placa', largura: 70, valor: (i) => i.placa },
    { titulo: 'Consultor', largura: 180, valor: (i) => i.consultorNome },
    { titulo: 'Valor', largura: 85, alinhar: 'right', valor: (i) => formatarMoeda(i.valor) },
  ]
}

function colunasRastreadores(): ColunaTabela<DescontoRastreadorItem>[] {
  return [
    { titulo: 'Contrato', largura: 75, valor: (i) => formatarDataBr(i.dt_contrato) },
    { titulo: 'Associado', largura: 250, valor: (i) => i.associado },
    { titulo: 'Placa', largura: 80, valor: (i) => i.placa },
    { titulo: 'Consultor', largura: 230, valor: (i) => i.consultorNome },
    { titulo: 'Valor', largura: 90, alinhar: 'right', valor: (i) => formatarMoeda(i.valor) },
  ]
}

function colunasPlacasAtivadas(): ColunaTabela<PlacaAtivadaItem>[] {
  return [
    { titulo: 'Data Contrato', largura: 80, valor: (i) => formatarDataBr(i.dt_contrato) },
    { titulo: 'Associado', largura: 280, valor: (i) => i.associado },
    { titulo: 'Placa', largura: 90, valor: (i) => i.placa },
    { titulo: 'Consultor', largura: 250, valor: (i) => i.consultorNome },
  ]
}

function colunasInadimplentes(): ColunaTabela<InadimplenteItem>[] {
  return [
    { titulo: 'Vencimento', largura: 70, valor: (i) => formatarDataBr(i.dt_vencimento) },
    { titulo: 'Cód. Boleto', largura: 65, valor: (i) => formatarCodCobranca(i.cod_cobranca) },
    { titulo: 'Referência', largura: 65, valor: (i) => formatarReferenciaMensalidade(i.referencia) },
    { titulo: 'Associado', largura: 160, valor: (i) => i.associado },
    { titulo: 'Placa', largura: 65, valor: (i) => i.placa },
    { titulo: 'Telefone', largura: 90, valor: (i) => i.telefone || '—' },
    { titulo: 'Consultor', largura: 155, valor: (i) => i.consultorNome },
    { titulo: 'Valor boleto', largura: 80, alinhar: 'right', valor: (i) => formatarMoeda(i.valorBoleto) },
  ]
}

export interface ResumoDashboard {
  totalAdesoes: number
  totalEquipe: number
  totalPremiacaoIndividual: number
  totalPremiacaoEquipe: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalComissaoGerencial: number
  totalBonusNivel: number
}

interface LinhaResumoDashboard {
  rotulo: string
  valor: string
}

export interface DetalhesDashboard {
  adesoes: AdesaoItem[]
  recorrencias: RecorrenciaItem[]
  descontosRastreador: DescontoRastreadorItem[]
  placasAtivadas: PlacaAtivadaItem[]
  inadimplentes: InadimplenteItem[]
  totalRecorrenciaEstimadaInadimplentes: number
}

// "Dashboard completo" — o resumo de sempre, seguido de uma seção por tipo de lançamento (cada
// uma numa página nova, mesmas colunas dos relatórios individuais). Landscape do início ao fim
// porque 4 das 5 seções de detalhe precisam da largura extra; o resumo (2 colunas) cabe folgado
// nela também.
export async function gerarPdfDashboard(
  nomeConsultor: string,
  ano: number,
  mes: number,
  resumo: ResumoDashboard,
  detalhes: DetalhesDashboard
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Apuração de Comissão — ProtegeClub', [nomeConsultor, periodo(ano, mes)])

  const totalReceber =
    resumo.totalAdesao +
    resumo.totalRecorrencia -
    resumo.totalDescontoRastreador +
    resumo.totalPremiacaoIndividual +
    resumo.totalPremiacaoEquipe +
    resumo.totalComissaoGerencial +
    resumo.totalBonusNivel

  const linhas: LinhaResumoDashboard[] = [
    { rotulo: 'Total de adesões', valor: String(resumo.totalAdesoes) },
    { rotulo: 'Total equipe', valor: String(resumo.totalEquipe) },
    { rotulo: 'Premiação individual', valor: formatarMoeda(resumo.totalPremiacaoIndividual) },
    { rotulo: 'Adesão', valor: formatarMoeda(resumo.totalAdesao) },
    { rotulo: 'Recorrência', valor: formatarMoeda(resumo.totalRecorrencia) },
    { rotulo: 'Desconto de rastreadores', valor: formatarMoeda(resumo.totalDescontoRastreador) },
    ...(resumo.totalComissaoGerencial > 0
      ? [{ rotulo: 'Comissão de gerência', valor: formatarMoeda(resumo.totalComissaoGerencial) }]
      : []),
    ...(resumo.totalBonusNivel > 0
      ? [{ rotulo: 'Bônus por nível', valor: formatarMoeda(resumo.totalBonusNivel) }]
      : []),
  ]

  desenharTabela<LinhaResumoDashboard>(
    doc,
    [
      { titulo: 'Métrica', largura: 540, valor: (l) => l.rotulo },
      { titulo: 'Valor', largura: 190, alinhar: 'right', valor: (l) => l.valor },
    ],
    linhas
  )

  doc.moveDown(0.8)
  doc.fontSize(12).fillColor(AZUL).font('Helvetica-Bold').text('Total a receber')
  doc.fontSize(22).fillColor('#111111').text(formatarMoeda(totalReceber))
  doc.moveDown(1)

  function novaSecao(titulo: string) {
    doc.addPage()
    doc.fillColor(AZUL).fontSize(15).font('Helvetica-Bold').text(titulo, { align: 'center' })
    doc.fillColor(CINZA).fontSize(10).font('Helvetica').text(`${nomeConsultor} — ${periodo(ano, mes)}`, {
      align: 'center',
    })
    doc.moveDown(0.8)
    doc.strokeColor(AZUL).lineWidth(1).moveTo(MARGEM, doc.y).lineTo(doc.page.width - MARGEM, doc.y).stroke()
    doc.moveDown(0.8)
  }

  novaSecao('Adesões (a receber no período)')
  const totalAdesoesValor = detalhes.adesoes.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasBoleto<AdesaoItem>(), detalhes.adesoes, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(totalAdesoesValor) },
  })

  novaSecao('Recorrência')
  const totalRecorrenciaValor = detalhes.recorrencias.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasBoleto<RecorrenciaItem>(), detalhes.recorrencias, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(totalRecorrenciaValor) },
  })

  novaSecao('Desconto Rastreadores')
  const totalRastreadoresValor = detalhes.descontosRastreador.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasRastreadores(), detalhes.descontosRastreador, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(totalRastreadoresValor) },
  })

  novaSecao('Placas Ativadas')
  doc
    .fontSize(9)
    .fillColor('#7A7A7A')
    .text(
      'Veículos cujo contrato começou no período — visão operacional (igual ao painel ' +
        '"Ativações" do Ileva), diferente da comissão de adesão (que só conta quando o boleto é ' +
        'efetivamente pago).'
    )
  doc.moveDown(0.6)
  desenharTabela(doc, colunasPlacasAtivadas(), detalhes.placasAtivadas, {
    linhaTotal: { rotulo: 'Total de placas ativadas', valor: String(detalhes.placasAtivadas.length) },
  })

  novaSecao('Inadimplentes')
  doc
    .fontSize(11)
    .fillColor(AZUL)
    .font('Helvetica-Bold')
    .text(
      `Valor estimado de recorrência a receber em caso de pagamento: ${formatarMoeda(detalhes.totalRecorrenciaEstimadaInadimplentes)}`
    )
  doc.moveDown(0.6)
  doc.font('Helvetica')
  const totalInadimplentesValor = detalhes.inadimplentes.reduce((s, i) => s + i.valorBoleto, 0)
  desenharTabela(doc, colunasInadimplentes(), detalhes.inadimplentes, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(totalInadimplentesValor) },
  })

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfAdesoes(
  nomeConsultor: string,
  ano: number,
  mes: number,
  itens: AdesaoItem[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Adesões (a receber no período)', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasBoleto<AdesaoItem>(), itens, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) },
  })

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfRecorrencia(
  nomeConsultor: string,
  ano: number,
  mes: number,
  itens: RecorrenciaItem[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Recorrência', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasBoleto<RecorrenciaItem>(), itens, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) },
  })

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfRastreadores(
  nomeConsultor: string,
  ano: number,
  mes: number,
  itens: DescontoRastreadorItem[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Desconto Rastreadores', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(doc, colunasRastreadores(), itens, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) },
  })

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfPlacasAtivadas(
  nomeConsultor: string,
  ano: number,
  mes: number,
  itens: PlacaAtivadaItem[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Placas Ativadas', [nomeConsultor, periodo(ano, mes)])

  doc
    .fontSize(9)
    .fillColor('#7A7A7A')
    .text(
      'Veículos cujo contrato começou no período — visão operacional (igual ao painel ' +
        '"Ativações" do Ileva), diferente da comissão de adesão (que só conta quando o boleto é ' +
        'efetivamente pago).'
    )
  doc.moveDown(0.6)

  desenharTabela(doc, colunasPlacasAtivadas(), itens, {
    linhaTotal: { rotulo: 'Total de placas ativadas', valor: String(itens.length) },
  })

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfInadimplentes(
  nomeConsultor: string,
  itens: InadimplenteItem[],
  totalRecorrenciaEstimada: number
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Inadimplentes', [nomeConsultor, `Estado atual — gerado em ${new Date().toLocaleDateString('pt-BR')}`])

  doc
    .fontSize(11)
    .fillColor('#1F3B57')
    .font('Helvetica-Bold')
    .text(`Valor estimado de recorrência a receber em caso de pagamento: ${formatarMoeda(totalRecorrenciaEstimada)}`)
  doc.moveDown(0.6)
  doc.font('Helvetica')

  const total = itens.reduce((s, i) => s + i.valorBoleto, 0)
  desenharTabela(doc, colunasInadimplentes(), itens, {
    linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) },
  })

  rodape(doc)
  doc.end()
  return fim
}
