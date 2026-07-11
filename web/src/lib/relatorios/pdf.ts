import PDFDocument from 'pdfkit'
import type { RelatorioConsolidado } from './consolidado'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarDataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export async function gerarPdfConsolidado(relatorio: RelatorioConsolidado): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const fim = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const azul = '#1F3B57'
  const cinza = '#4A4A4A'

  doc
    .fillColor(azul)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Relatório Consolidado de Comissões', { align: 'center' })
  doc
    .fillColor(cinza)
    .fontSize(11)
    .font('Helvetica')
    .text('Protege Club', { align: 'center' })
  doc
    .fontSize(10)
    .fillColor('#7A7A7A')
    .text(
      `Período: ${formatarDataBr(relatorio.dataInicio)} a ${formatarDataBr(relatorio.dataFim)}`,
      { align: 'center' }
    )
  doc.moveDown(1.2)
  doc
    .strokeColor(azul)
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .stroke()
  doc.moveDown(1)

  // Resumo geral
  doc.fontSize(13).fillColor(azul).font('Helvetica-Bold').text('Resumo geral')
  doc.moveDown(0.4)
  doc.fontSize(10.5).fillColor('#222222').font('Helvetica')
  doc.text(`Total de adesão: ${formatarMoeda(relatorio.totalAdesaoGeral)}`)
  doc.text(`Total de recorrência: ${formatarMoeda(relatorio.totalRecorrenciaGeral)}`)
  doc.font('Helvetica-Bold').text(`Total líquido: ${formatarMoeda(relatorio.totalLiquidoGeral)}`)
  doc.font('Helvetica')
  doc.moveDown(0.8)

  const mesesFaltantes = relatorio.mesesConsiderados.filter((m) => m.consultoresAtivosSemApuracao > 0)
  if (mesesFaltantes.length > 0) {
    doc.fillColor('#92400E').fontSize(9.5)
    doc.text(
      'Atenção: nem todos os consultores tinham apuração gerada para os meses abaixo no ' +
        'momento deste relatório — os valores deles não estão incluídos:'
    )
    for (const m of mesesFaltantes) {
      doc.text(
        `  • ${NOMES_MESES[m.mes - 1]}/${m.ano}: ${m.consultoresAtivosSemApuracao} consultor(es) ativo(s) sem apuração gerada`
      )
    }
    doc.fillColor('#222222')
    doc.moveDown(0.8)
  }

  // Tabela
  doc.fontSize(13).fillColor(azul).font('Helvetica-Bold').text('Por consultor')
  doc.moveDown(0.4)

  const colX = { nome: 40, adesao: 280, recorrencia: 370, liquido: 460 }
  const larguraColunaValor = 80
  const larguraPagina = doc.page.width - 40

  function cabecalhoTabela() {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF')
    const y = doc.y
    doc.rect(40, y, larguraPagina - 40, 18).fill(azul)
    doc.fillColor('#FFFFFF')
    doc.text('Consultor', colX.nome + 4, y + 5)
    doc.text('Adesão', colX.adesao, y + 5, { width: larguraColunaValor, align: 'right' })
    doc.text('Recorrência', colX.recorrencia, y + 5, { width: larguraColunaValor, align: 'right' })
    doc.text('Líquido', colX.liquido, y + 5, { width: larguraColunaValor, align: 'right' })
    doc.y = y + 20
  }

  cabecalhoTabela()
  doc.font('Helvetica').fontSize(9.5).fillColor('#222222')

  relatorio.linhas.forEach((linha, i) => {
    if (doc.y > doc.page.height - 80) {
      doc.addPage()
      cabecalhoTabela()
      doc.font('Helvetica').fontSize(9.5).fillColor('#222222')
    }
    const y = doc.y
    if (i % 2 === 1) {
      doc.rect(40, y - 2, larguraPagina - 40, 16).fill('#EAF1F8')
      doc.fillColor('#222222')
    }
    doc.text(linha.nomeConsultor, colX.nome + 4, y, { width: colX.adesao - colX.nome - 8 })
    doc.text(formatarMoeda(linha.totalAdesao), colX.adesao, y, { width: larguraColunaValor, align: 'right' })
    doc.text(formatarMoeda(linha.totalRecorrencia), colX.recorrencia, y, { width: larguraColunaValor, align: 'right' })
    doc.text(formatarMoeda(linha.totalLiquido), colX.liquido, y, { width: larguraColunaValor, align: 'right' })
    doc.y = y + 16
  })

  if (relatorio.linhas.length === 0) {
    doc.fillColor('#7A7A7A').text('Nenhum lançamento encontrado neste intervalo.', 40, doc.y + 4)
  }

  doc.moveDown(1.5)
  doc
    .fontSize(8.5)
    .fillColor('#7A7A7A')
    .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })

  doc.end()
  return fim
}
