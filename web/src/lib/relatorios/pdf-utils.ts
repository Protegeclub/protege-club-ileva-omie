import PDFDocument from 'pdfkit'

export const AZUL = '#1F3B57'
export const CINZA = '#4A4A4A'
export const MARGEM = 40

// Teto defensivo pra altura de UMA célula (ex.: um valor sem espaços numa coluna estreita, que
// mediria uma altura de "quebra" desproporcional) — acima disso a célula volta a truncar com
// "..." em vez de deixar 1 dado sujo esticar a linha inteira e distorcer o layout da tabela.
const ALTURA_MAX_CELULA = 120
const PAD_V_CABECALHO = 8
const PAD_V_CORPO = 6
const PISO_CABECALHO = 12
const PISO_CORPO = 11

export function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function criarDocumento(opcoes?: { layout?: 'portrait' | 'landscape' }) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGEM, layout: opcoes?.layout ?? 'portrait' })
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

interface CelulaMedida {
  texto: string
  altura: number
  ellipsis: boolean
}

// Mede cada célula da linha com o texto/fonte JÁ definidos em `doc` (heightOfString usa o estado
// atual de fonte/tamanho) e devolve a altura "natural" de cada uma, capada em ALTURA_MAX_CELULA
// (com ellipsis=true nesse caso) — quem chama pega o maior valor pra decidir a altura da linha
// inteira. `heightOfString` sempre mede o texto completo (ignora `height`/corte), então medição
// e desenho usam o mesmo motor de quebra e nunca discordam entre si.
function medirCelulas<T>(doc: PDFKit.PDFDocument, colunas: ColunaTabela<T>[], obterTexto: (c: ColunaTabela<T>) => string, piso: number): CelulaMedida[] {
  return colunas.map((c) => {
    const texto = obterTexto(c)
    const alturaNatural = doc.heightOfString(texto, { width: c.largura - 8 })
    const estourou = alturaNatural > ALTURA_MAX_CELULA
    return { texto, altura: estourou ? ALTURA_MAX_CELULA : Math.max(piso, alturaNatural), ellipsis: estourou }
  })
}

// Desenha uma tabela com colunas de largura fixa que somam, no máximo, a largura útil da página
// (A4 retrato ~515pt, paisagem ~762pt) — aprendido do bug de corte no relatório consolidado:
// melhor somar as larguras aqui em vez de chutar posições x soltas. Altura de linha é dinâmica
// (quebra de linha real via word-wrap, nunca corta texto por padrão) — só uma célula
// patologicamente alta (ver ALTURA_MAX_CELULA) volta a truncar com "...", isolada, sem puxar o
// resto da tabela.
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

  function cabecalhoTabela() {
    const y = doc.y
    doc.font('Helvetica-Bold').fontSize(9.5)
    const celulas = medirCelulas(doc, colunas, (c) => c.titulo, PISO_CABECALHO)
    const alturaConteudo = Math.max(...celulas.map((c) => c.altura))
    const alturaRect = alturaConteudo + PAD_V_CABECALHO

    doc.rect(MARGEM, y, larguraTotal, alturaRect).fill(AZUL)
    doc.fillColor('#FFFFFF')
    colunas.forEach((c, i) => {
      doc.text(celulas[i].texto, xs[i] + 4, y + PAD_V_CABECALHO / 2, {
        width: c.largura - 8,
        align: c.alinhar ?? 'left',
        height: alturaConteudo,
        ellipsis: celulas[i].ellipsis,
      })
    })
    doc.y = y + alturaRect
  }

  cabecalhoTabela()

  linhas.forEach((linha, i) => {
    doc.font('Helvetica').fontSize(9).fillColor('#222222')
    const celulas = medirCelulas(doc, colunas, (c) => c.valor(linha), PISO_CORPO)
    const alturaConteudo = Math.max(...celulas.map((c) => c.altura))
    const alturaLinha = alturaConteudo + PAD_V_CORPO

    if (doc.y + alturaLinha > doc.page.height - 90) {
      doc.addPage()
      cabecalhoTabela()
      doc.font('Helvetica').fontSize(9).fillColor('#222222')
    }

    const y = doc.y
    if (i % 2 === 1) {
      doc.rect(MARGEM, y - 2, larguraTotal, alturaLinha).fill('#EAF1F8')
      doc.fillColor('#222222')
    }
    colunas.forEach((c, j) => {
      doc.text(celulas[j].texto, xs[j] + 4, y, {
        width: c.largura - 8,
        align: c.alinhar ?? 'left',
        height: alturaConteudo,
        ellipsis: celulas[j].ellipsis,
      })
    })
    doc.y = y + alturaLinha
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

  // Toda célula acima é desenhada com `doc.text(str, x, y, {...})` (posição explícita) — isso
  // deixa o cursor horizontal do PDFKit parado na última coluna desenhada. Sem resetar aqui,
  // qualquer `doc.text(...)` sem x explícito logo depois de uma tabela (ex.: o resumo do próximo
  // consultor em todos-consultores.ts) herda essa posição e quebra em uma coluna estreita à
  // direita — só se corrige sozinho na próxima quebra de página. Bug real, visto no PDF de
  // "Todos os Consultores" (26/07/2026).
  doc.x = MARGEM
}

export function rodape(doc: PDFKit.PDFDocument) {
  doc.moveDown(1.5)
  doc
    .fontSize(8.5)
    .fillColor('#7A7A7A')
    .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
}
