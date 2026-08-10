import type { PlacaAtivadaItem } from '@/lib/apuracao/mensal'
import { criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, MARGEM, rodape } from './pdf-utils'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarDataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export interface ItemTodosConsultores {
  cod_consultor: number
  nomeConsultor: string
  equipe: string
  gerado: boolean
  qtdAdesoes: number
  qtdPlacasAtivadas: number
  qtdInadimplentes: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  totalLiquido: number
  placasAtivadas: PlacaAtivadaItem[]
}

interface PlacaComConsultor extends PlacaAtivadaItem {
  consultorNome: string
}

// Um PDF só, agrupado por equipe (com subtotal por equipe) — se o chamador já filtrou pra uma
// equipe só, isso vira naturalmente uma seção única. Cada equipe ganha uma tabela-resumo de
// todos os consultores (não mais um parágrafo de texto por consultor — muito mais fácil de
// escanear e comparar) seguida da lista de placas ativadas da equipe, se houver.
export async function gerarPdfTodosConsultores(
  ano: number,
  mes: number,
  itens: ItemTodosConsultores[]
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Apuração de Comissões — Todos os Consultores', [
    'ProtegeClub',
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

  if (gerados.length === 0) {
    doc.fillColor('#7A7A7A').fontSize(10).text('Nenhum consultor selecionado tinha apuração gerada neste período.')
    doc.moveDown(0.8)
  }

  const porEquipe = new Map<string, ItemTodosConsultores[]>()
  for (const item of gerados) {
    const chave = item.equipe || '—'
    if (!porEquipe.has(chave)) porEquipe.set(chave, [])
    porEquipe.get(chave)!.push(item)
  }
  const equipesOrdenadas = Array.from(porEquipe.keys()).sort((a, b) => a.localeCompare(b))

  for (const equipe of equipesOrdenadas) {
    const itensEquipe = porEquipe.get(equipe)!.sort((a, b) => b.totalLiquido - a.totalLiquido)
    const totalAdesaoEquipe = itensEquipe.reduce((s, i) => s + i.totalAdesao, 0)
    const totalRecorrenciaEquipe = itensEquipe.reduce((s, i) => s + i.totalRecorrencia, 0)
    const totalDescontoEquipe = itensEquipe.reduce((s, i) => s + i.totalDescontoRastreador, 0)
    const totalLiquidoEquipe = itensEquipe.reduce((s, i) => s + i.totalLiquido, 0)

    if (doc.y > doc.page.height - 150) doc.addPage()
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1F3B57').text(`Equipe: ${equipe}`)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#4A4A4A')
      .text(
        `${itensEquipe.length} consultor(es) — Adesão: ${formatarMoeda(totalAdesaoEquipe)} · Recorrência: ` +
          `${formatarMoeda(totalRecorrenciaEquipe)} · Desconto: ${formatarMoeda(totalDescontoEquipe)} · ` +
          `Líquido: ${formatarMoeda(totalLiquidoEquipe)}`
      )
    doc.moveDown(0.4)

    desenharTabela<ItemTodosConsultores>(
      doc,
      [
        { titulo: 'Consultor', largura: 180, valor: (i) => `${i.nomeConsultor} #${i.cod_consultor}` },
        { titulo: 'Adesões', largura: 55, alinhar: 'right', valor: (i) => String(i.qtdAdesoes) },
        { titulo: 'Adesão', largura: 85, alinhar: 'right', valor: (i) => formatarMoeda(i.totalAdesao) },
        { titulo: 'Recorrência', largura: 85, alinhar: 'right', valor: (i) => formatarMoeda(i.totalRecorrencia) },
        { titulo: 'Desconto', largura: 75, alinhar: 'right', valor: (i) => formatarMoeda(i.totalDescontoRastreador) },
        { titulo: 'Inadimpl.', largura: 65, alinhar: 'right', valor: (i) => String(i.qtdInadimplentes) },
        { titulo: 'Placas', largura: 65, alinhar: 'right', valor: (i) => String(i.qtdPlacasAtivadas) },
        { titulo: 'Líquido', largura: 90, alinhar: 'right', valor: (i) => formatarMoeda(i.totalLiquido) },
      ],
      itensEquipe
    )
    doc.moveDown(0.6)

    // Placas ativadas de toda a equipe numa tabela só (não mais 1 mini-tabela por consultor) —
    // por isso a coluna Consultor volta aqui: sem o bloco de texto individual, o contexto de
    // "de quem é essa placa" deixa de ser óbvio.
    const placasEquipe: PlacaComConsultor[] = itensEquipe.flatMap((i) =>
      i.placasAtivadas.map((p) => ({ ...p, consultorNome: i.nomeConsultor }))
    )
    if (placasEquipe.length > 0) {
      if (doc.y > doc.page.height - 150) doc.addPage()
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1F3B57').text(`Placas ativadas — ${equipe}`)
      doc.moveDown(0.2)
      desenharTabela<PlacaComConsultor>(
        doc,
        [
          { titulo: 'Data Contrato', largura: 80, valor: (p) => formatarDataBr(p.dt_contrato) },
          { titulo: 'Associado', largura: 300, valor: (p) => p.associado },
          { titulo: 'Placa', largura: 90, valor: (p) => p.placa },
          { titulo: 'Consultor', largura: 270, valor: (p) => p.consultorNome },
        ],
        placasEquipe,
        { linhaTotal: { rotulo: 'Total de placas ativadas', valor: String(placasEquipe.length) } }
      )
      doc.moveDown(0.4)
    }

    doc.moveDown(0.4)
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
