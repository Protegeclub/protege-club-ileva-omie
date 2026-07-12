import { criarDocumento, desenharCabecalho, formatarMoeda, MARGEM, rodape } from './pdf-utils'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export interface ItemTodosConsultores {
  cod_consultor: number
  nomeConsultor: string
  equipe: string
  gerado: boolean
  qtdAdesoes: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalLiquido: number
}

// Um PDF só, mas com uma seção separada por consultor (não uma tabela única resumida como
// gerarPdfConsolidado) — pensado pra imprimir/arquivar a apuração detalhada de todos de uma vez,
// mantendo cada consultor claramente distinto no documento.
export async function gerarPdfTodosConsultores(
  ano: number,
  mes: number,
  itens: ItemTodosConsultores[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento()
  desenharCabecalho(doc, 'Apuração de Comissões — Todos os Consultores', [
    'Protege Club',
    `Referência: ${NOMES_MESES[mes - 1]}/${ano}`,
  ])

  const gerados = itens.filter((i) => i.gerado)
  const pendentes = itens.filter((i) => !i.gerado)
  const totalGeral = gerados.reduce((s, i) => s + i.totalLiquido, 0)

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1F3B57').text(`Total líquido geral: ${formatarMoeda(totalGeral)}`)
  doc
    .fontSize(9.5)
    .font('Helvetica')
    .fillColor('#4A4A4A')
    .text(`${gerados.length} de ${itens.length} consultor(es) selecionado(s) com apuração gerada neste período.`)
  doc.moveDown(0.8)
  doc
    .strokeColor('#1F3B57')
    .lineWidth(1)
    .moveTo(MARGEM, doc.y)
    .lineTo(doc.page.width - MARGEM, doc.y)
    .stroke()
  doc.moveDown(0.8)

  for (const item of gerados) {
    if (doc.y > doc.page.height - 130) {
      doc.addPage()
    }
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1F3B57').text(`${item.nomeConsultor}  #${item.cod_consultor}`)
    doc.fontSize(8.5).font('Helvetica').fillColor('#7A7A7A').text(`Equipe: ${item.equipe || '—'}`)
    doc.moveDown(0.35)

    doc.fontSize(9.5).font('Helvetica').fillColor('#222222')
    doc.text(`Adesões no período: ${item.qtdAdesoes}`)
    doc.text(`Adesão: ${formatarMoeda(item.totalAdesao)}    Recorrência: ${formatarMoeda(item.totalRecorrencia)}    Desconto rastreador: ${formatarMoeda(item.totalDescontoRastreador)}`)
    doc.font('Helvetica-Bold').fontSize(10.5).text(`Total líquido: ${formatarMoeda(item.totalLiquido)}`)
    doc.moveDown(0.4)

    doc
      .strokeColor('#DCE3EA')
      .lineWidth(0.5)
      .moveTo(MARGEM, doc.y)
      .lineTo(doc.page.width - MARGEM, doc.y)
      .stroke()
    doc.moveDown(0.5)
  }

  if (gerados.length === 0) {
    doc.fillColor('#7A7A7A').fontSize(10).text('Nenhum consultor selecionado tinha apuração gerada neste período.')
    doc.moveDown(0.8)
  }

  if (pendentes.length > 0) {
    if (doc.y > doc.page.height - 100) doc.addPage()
    doc.moveDown(0.3)
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#92400E').text('Sem apuração gerada neste período (não incluídos nos totais acima):')
    doc.font('Helvetica').fontSize(9).fillColor('#92400E')
    doc.text(pendentes.map((p) => `${p.nomeConsultor} #${p.cod_consultor}`).join('; '))
  }

  rodape(doc)
  doc.end()
  return fim
}
