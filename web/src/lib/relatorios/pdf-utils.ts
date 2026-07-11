import PDFDocument from 'pdfkit'

export const AZUL = '#1F3B57'
export const CINZA = '#4A4A4A'
export const MARGEM = 40

export function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function criarDocumento() {
  const doc = new PDFDocument({ size: 'A4', margin: MARGEM })
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const fim = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
  return { doc, fim }
}

export function desenharCabecalho(doc: PDFKit.PDFDocument, titulo: string, subtitulos: string[]) {
  doc.fillColor(AZUL).fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' })
  doc.fillColor(CINZA).fontSize(10).font('Helvetica')
  for (const linha of subtitulos) {
    doc.text(linha, { align: 'center' })
  }
  doc.moveDown(0.8)
  doc
    .strokeColor(AZUL)
    .lineWidth(1)
    .moveTo(MARGEM, doc.y)
    .lineTo(doc.page.width - MARGEM, doc.y)
    .stroke()
  doc.moveDown(0.8)
}

export interface ColunaTabela<T> {
  titulo: string
  largura: number
  alinhar?: 'left' | 'right'
  valor: (item: T) => string
}

// Desenha uma tabela com colunas de largura fixa que somam, no máximo, a largura útil da
// página (A4 - margens = ~515pt) — aprendido do bug de corte no relatório consolidado: melhor
// somar as larguras aqui em vez de chutar posições x soltas.
export function desenharTabela<T>(
  doc: PDFKit.PDFDocument,
  colunas: ColunaTabela<T>[],
  linhas: T[],
  opcoes?: { linhaTotal?: { rotulo: string; valor: string } }
) {
  const larguraUtil = doc.page.width - MARGEM * 2
  const larguraTotal = colunas.reduce((s, c) => s + c.largura, 0)
  if (larguraTotal > larguraUtil + 1) {
    throw new Error(
      `Colunas somam ${larguraTotal}pt, mas a página só tem ${larguraUtil}pt úteis — ajuste as larguras.`
    )
  }

  function posicoesX() {
    const xs: number[] = []
    let x = MARGEM
    for (const c of colunas) {
      xs.push(x)
      x += c.largura
    }
    return xs
  }
  const xs = posicoesX()

  // `ellipsis: true` força uma linha só (trunca com "..." em vez de quebrar linha) — sem isso,
  // um cabeçalho comprido ("Valor a Descontar") ou um nome longo de consultor quebra em duas
  // linhas e desalinha visualmente o resto da linha/cabeçalho (bug visto no teste real).
  function cabecalhoTabela() {
    const y = doc.y
    doc.rect(MARGEM, y, larguraTotal, 18).fill(AZUL)
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5)
    colunas.forEach((c, i) => {
      doc.text(c.titulo, xs[i] + 4, y + 5, {
        width: c.largura - 8,
        align: c.alinhar ?? 'left',
        height: 12,
        ellipsis: true,
      })
    })
    doc.y = y + 20
  }

  cabecalhoTabela()
  doc.font('Helvetica').fontSize(9).fillColor('#222222')

  linhas.forEach((linha, i) => {
    if (doc.y > doc.page.height - 90) {
      doc.addPage()
      cabecalhoTabela()
      doc.font('Helvetica').fontSize(9).fillColor('#222222')
    }
    const y = doc.y
    if (i % 2 === 1) {
      doc.rect(MARGEM, y - 2, larguraTotal, 15).fill('#EAF1F8')
      doc.fillColor('#222222')
    }
    colunas.forEach((c, j) => {
      doc.text(c.valor(linha), xs[j] + 4, y, {
        width: c.largura - 8,
        align: c.alinhar ?? 'left',
        height: 11,
        ellipsis: true,
      })
    })
    doc.y = y + 15
  })

  if (linhas.length === 0) {
    doc.fillColor('#7A7A7A').text('Nenhum registro encontrado.', MARGEM, doc.y + 4)
  }

  if (opcoes?.linhaTotal) {
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111111')
    doc.text(`${opcoes.linhaTotal.rotulo}: ${opcoes.linhaTotal.valor}`, MARGEM, doc.y, {
      width: larguraTotal,
      align: 'right',
    })
  }
}

export function rodape(doc: PDFKit.PDFDocument) {
  doc.moveDown(1.5)
  doc
    .fontSize(8.5)
    .fillColor('#7A7A7A')
    .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
}
