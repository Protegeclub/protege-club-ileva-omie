import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  PlacaAtivadaItem,
  RecorrenciaItem,
} from '@/lib/apuracao/mensal'
import { criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape, type ColunaTabela } from './pdf-utils'

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

export async function gerarPdfDashboard(
  nomeConsultor: string,
  ano: number,
  mes: number,
  resumo: ResumoDashboard
): Promise<Buffer> {
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Apuração de Comissão — ProtegeClub', [nomeConsultor, periodo(ano, mes)])

  const totalReceber =
    resumo.totalAdesao +
    resumo.totalRecorrencia -
    resumo.totalDescontoRastreador +
    resumo.totalPremiacaoIndividual +
    resumo.totalPremiacaoEquipe +
    resumo.totalComissaoGerencial +
    resumo.totalBonusNivel

  doc.fontSize(12).fillColor('#1F3B57').font('Helvetica-Bold').text('Total a receber')
  doc.fontSize(22).fillColor('#111111').text(formatarMoeda(totalReceber))
  doc.moveDown(1)

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
      { titulo: 'Métrica', largura: 380, valor: (l) => l.rotulo },
      { titulo: 'Valor', largura: 135, alinhar: 'right', valor: (l) => l.valor },
    ],
    linhas
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
  desenharTabela(
    doc,
    [
      { titulo: 'Contrato', largura: 75, valor: (i: DescontoRastreadorItem) => formatarDataBr(i.dt_contrato) },
      { titulo: 'Associado', largura: 250, valor: (i: DescontoRastreadorItem) => i.associado },
      { titulo: 'Placa', largura: 80, valor: (i: DescontoRastreadorItem) => i.placa },
      { titulo: 'Consultor', largura: 230, valor: (i: DescontoRastreadorItem) => i.consultorNome },
      {
        titulo: 'Valor',
        largura: 90,
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

  desenharTabela(
    doc,
    [
      { titulo: 'Data Contrato', largura: 80, valor: (i: PlacaAtivadaItem) => formatarDataBr(i.dt_contrato) },
      { titulo: 'Associado', largura: 280, valor: (i: PlacaAtivadaItem) => i.associado },
      { titulo: 'Placa', largura: 90, valor: (i: PlacaAtivadaItem) => i.placa },
      { titulo: 'Consultor', largura: 250, valor: (i: PlacaAtivadaItem) => i.consultorNome },
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
  desenharTabela(
    doc,
    [
      { titulo: 'Vencimento', largura: 70, valor: (i: InadimplenteItem) => formatarDataBr(i.dt_vencimento) },
      { titulo: 'Cód. Boleto', largura: 65, valor: (i: InadimplenteItem) => formatarCodCobranca(i.cod_cobranca) },
      { titulo: 'Referência', largura: 65, valor: (i: InadimplenteItem) => formatarReferenciaMensalidade(i.referencia) },
      { titulo: 'Associado', largura: 160, valor: (i: InadimplenteItem) => i.associado },
      { titulo: 'Placa', largura: 65, valor: (i: InadimplenteItem) => i.placa },
      { titulo: 'Telefone', largura: 90, valor: (i: InadimplenteItem) => i.telefone || '—' },
      { titulo: 'Consultor', largura: 155, valor: (i: InadimplenteItem) => i.consultorNome },
      {
        titulo: 'Valor boleto',
        largura: 80,
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
