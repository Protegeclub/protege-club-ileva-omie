import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  PlacaAtivadaItem,
  RecorrenciaItem,
} from '@/lib/apuracao/mensal'
import { criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape } from './pdf-utils'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function periodo(ano: number, mes: number) {
  return `Referência: ${NOMES_MESES[mes - 1]}/${ano}`
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
}

export async function gerarPdfDashboard(
  nomeConsultor: string,
  ano: number,
  mes: number,
  resumo: ResumoDashboard
): Promise<Buffer> {
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Apuração de Comissão — Protege Club', [nomeConsultor, periodo(ano, mes)])

  const totalReceber =
    resumo.totalAdesao +
    resumo.totalRecorrencia -
    resumo.totalDescontoRastreador +
    resumo.totalPremiacaoIndividual +
    resumo.totalPremiacaoEquipe +
    resumo.totalComissaoGerencial

  doc.fontSize(12).fillColor('#1F3B57').font('Helvetica-Bold').text('Total a receber')
  doc.fontSize(22).fillColor('#111111').text(formatarMoeda(totalReceber))
  doc.moveDown(1)

  doc.fontSize(11).font('Helvetica').fillColor('#222222')
  const linhas: [string, string][] = [
    ['Total de adesões', String(resumo.totalAdesoes)],
    ['Total equipe', String(resumo.totalEquipe)],
    ['Premiação individual', formatarMoeda(resumo.totalPremiacaoIndividual)],
    ['Premiação líder de equipe', formatarMoeda(resumo.totalPremiacaoEquipe)],
    ['Adesão', formatarMoeda(resumo.totalAdesao)],
    ['Recorrência', formatarMoeda(resumo.totalRecorrencia)],
    ['Desconto de rastreadores', formatarMoeda(resumo.totalDescontoRastreador)],
    ...(resumo.totalComissaoGerencial > 0
      ? ([['Comissão de gerência', formatarMoeda(resumo.totalComissaoGerencial)]] as [string, string][])
      : []),
  ]
  for (const [rotulo, valor] of linhas) {
    doc.text(`${rotulo}: `, { continued: true }).font('Helvetica-Bold').text(valor).font('Helvetica')
  }

  doc.moveDown(0.5)
  doc
    .fontSize(9)
    .fillColor('#92400E')
    .text(
      'Premiação (individual e de líder de equipe) ainda depende da definição das regras do ' +
        'plano de carreira com o cliente.'
    )

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
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Adesões (a receber no período)', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(
    doc,
    [
      { titulo: 'Data Pagamento', largura: 90, valor: (i: AdesaoItem) => i.dt_pagamento ?? '—' },
      { titulo: 'Associado', largura: 200, valor: (i: AdesaoItem) => i.associado },
      { titulo: 'Consultor', largura: 150, valor: (i: AdesaoItem) => i.consultorNome },
      { titulo: 'Valor', largura: 75, alinhar: 'right', valor: (i: AdesaoItem) => formatarMoeda(i.valor) },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) } }
  )

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
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Recorrência', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(
    doc,
    [
      { titulo: 'Associado', largura: 200, valor: (i: RecorrenciaItem) => i.associado },
      { titulo: 'Placa', largura: 90, valor: (i: RecorrenciaItem) => i.placa },
      { titulo: 'Consultor', largura: 150, valor: (i: RecorrenciaItem) => i.consultorNome },
      { titulo: 'Valor', largura: 75, alinhar: 'right', valor: (i: RecorrenciaItem) => formatarMoeda(i.valor) },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) } }
  )

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
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Desconto Rastreadores', [nomeConsultor, periodo(ano, mes)])

  const total = itens.reduce((s, i) => s + i.valor, 0)
  desenharTabela(
    doc,
    [
      { titulo: 'Contrato', largura: 60, valor: (i: DescontoRastreadorItem) => i.dt_contrato },
      { titulo: 'Associado', largura: 175, valor: (i: DescontoRastreadorItem) => i.associado },
      { titulo: 'Placa', largura: 55, valor: (i: DescontoRastreadorItem) => i.placa },
      { titulo: 'Consultor', largura: 150, valor: (i: DescontoRastreadorItem) => i.consultorNome },
      {
        titulo: 'Valor',
        largura: 75,
        alinhar: 'right',
        valor: (i: DescontoRastreadorItem) => formatarMoeda(i.valor),
      },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) } }
  )

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
  const { doc, fim } = criarDocumento()
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

  desenharTabela(
    doc,
    [
      { titulo: 'Data Contrato', largura: 70, valor: (i: PlacaAtivadaItem) => i.dt_contrato },
      { titulo: 'Associado', largura: 200, valor: (i: PlacaAtivadaItem) => i.associado },
      { titulo: 'Placa', largura: 70, valor: (i: PlacaAtivadaItem) => i.placa },
      { titulo: 'Consultor', largura: 175, valor: (i: PlacaAtivadaItem) => i.consultorNome },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total de placas ativadas', valor: String(itens.length) } }
  )

  rodape(doc)
  doc.end()
  return fim
}

export async function gerarPdfInadimplentes(
  nomeConsultor: string,
  itens: InadimplenteItem[],
  totalRecorrenciaEstimada: number
): Promise<Buffer> {
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Inadimplentes', [nomeConsultor, `Estado atual — gerado em ${new Date().toLocaleDateString('pt-BR')}`])

  doc
    .fontSize(11)
    .fillColor('#1F3B57')
    .font('Helvetica-Bold')
    .text(`Valor estimado de recorrência a receber em caso de pagamento: ${formatarMoeda(totalRecorrenciaEstimada)}`)
  doc.moveDown(0.6)
  doc.font('Helvetica')

  const total = itens.reduce((s, i) => s + i.valorBoleto, 0)
  desenharTabela(
    doc,
    [
      { titulo: 'Vencimento', largura: 70, valor: (i: InadimplenteItem) => i.dt_vencimento },
      { titulo: 'Associado', largura: 140, valor: (i: InadimplenteItem) => i.associado },
      { titulo: 'Telefone', largura: 95, valor: (i: InadimplenteItem) => i.telefone || '—' },
      { titulo: 'Consultor', largura: 135, valor: (i: InadimplenteItem) => i.consultorNome },
      {
        titulo: 'Valor boleto',
        largura: 75,
        alinhar: 'right',
        valor: (i: InadimplenteItem) => formatarMoeda(i.valorBoleto),
      },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total', valor: formatarMoeda(total) } }
  )

  rodape(doc)
  doc.end()
  return fim
}
