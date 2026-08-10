import type { PlacaAtivadaComEquipe, RelatorioConsolidado } from './consolidado'
import { AZUL, CINZA, criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape } from './pdf-utils'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarDataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

interface LinhaComEquipe {
  nomeConsultor: string
  equipe: string
  totalAdesao: number
  totalRecorrencia: number
  totalLiquido: number
}

// Reescrito pra usar a infraestrutura compartilhada (criarDocumento/desenharCabecalho/
// desenharTabela) em vez de posições `colX` fixas desenhadas à mão — a versão anterior não
// tinha ellipsis/altura definidas, então um nome de consultor comprido quebrava em várias linhas
// e desalinhava a linha seguinte (mesma classe de bug documentada em pdf-utils.ts). Mesmas
// colunas de sempre (Consultor/Adesão/Recorrência/Líquido), mesmo agrupamento por equipe com
// subtotal — só troca o motor de desenho.
export async function gerarPdfConsolidado(relatorio: RelatorioConsolidado): Promise<Buffer> {
  const { doc, fim } = criarDocumento()

  const subtitulos = [`Período: ${formatarDataBr(relatorio.dataInicio)} a ${formatarDataBr(relatorio.dataFim)}`]
  if (relatorio.equipeFiltro) subtitulos.push(`Equipe: ${relatorio.equipeFiltro}`)
  desenharCabecalho(doc, 'Relatório Consolidado de Comissões', subtitulos)

  // Resumo geral
  doc.fontSize(13).fillColor(AZUL).font('Helvetica-Bold').text('Resumo geral')
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

  // Por consultor, agrupado por equipe (com subtotal) — quando `equipeFiltro` já veio
  // preenchido isso resulta em uma seção só, sem custo extra.
  doc.fontSize(13).fillColor(AZUL).font('Helvetica-Bold').text('Por consultor')
  doc.moveDown(0.4)

  if (relatorio.linhas.length === 0) {
    doc.fillColor('#7A7A7A').fontSize(10).text('Nenhum lançamento encontrado neste intervalo.')
  }

  const porEquipe = new Map<string, LinhaComEquipe[]>()
  for (const linha of relatorio.linhas) {
    const chave = linha.equipe || '—'
    if (!porEquipe.has(chave)) porEquipe.set(chave, [])
    porEquipe.get(chave)!.push(linha)
  }
  const equipesOrdenadas = Array.from(porEquipe.keys()).sort((a, b) => a.localeCompare(b))

  for (const equipe of equipesOrdenadas) {
    const linhasEquipe = porEquipe.get(equipe)!
    const totalEquipe = linhasEquipe.reduce((s, l) => s + l.totalLiquido, 0)

    if (doc.y > doc.page.height - 130) doc.addPage()
    doc.fontSize(11).font('Helvetica-Bold').fillColor(AZUL).text(`Equipe: ${equipe}`)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(CINZA)
      .text(`${linhasEquipe.length} consultor(es) — total líquido: ${formatarMoeda(totalEquipe)}`)
    doc.moveDown(0.3)

    desenharTabela<LinhaComEquipe>(
      doc,
      [
        { titulo: 'Consultor', largura: 275, valor: (l) => l.nomeConsultor },
        { titulo: 'Adesão', largura: 80, alinhar: 'right', valor: (l) => formatarMoeda(l.totalAdesao) },
        { titulo: 'Recorrência', largura: 80, alinhar: 'right', valor: (l) => formatarMoeda(l.totalRecorrencia) },
        { titulo: 'Líquido', largura: 80, alinhar: 'right', valor: (l) => formatarMoeda(l.totalLiquido) },
      ],
      linhasEquipe
    )
    doc.moveDown(0.5)
  }

  // Placas ativadas no período — pedido antigo do Samuel ("todo relatório que toca em placa
  // lista com data de contrato"), nunca implementado neste relatório específico.
  if (relatorio.placasAtivadas.length > 0) {
    if (doc.y > doc.page.height - 150) doc.addPage()
    doc.moveDown(0.4)
    doc.fontSize(13).fillColor(AZUL).font('Helvetica-Bold').text('Placas ativadas no período')
    doc.moveDown(0.3)

    const porEquipePlacas = new Map<string, PlacaAtivadaComEquipe[]>()
    for (const placa of relatorio.placasAtivadas) {
      const chave = placa.equipe || '—'
      if (!porEquipePlacas.has(chave)) porEquipePlacas.set(chave, [])
      porEquipePlacas.get(chave)!.push(placa)
    }
    const equipesComPlacas = Array.from(porEquipePlacas.keys()).sort((a, b) => a.localeCompare(b))

    for (const equipe of equipesComPlacas) {
      const placasEquipe = porEquipePlacas.get(equipe)!
      if (doc.y > doc.page.height - 130) doc.addPage()
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(AZUL).text(`Equipe: ${equipe}`)
      doc.moveDown(0.2)
      desenharTabela<PlacaAtivadaComEquipe>(
        doc,
        [
          { titulo: 'Data Contrato', largura: 70, valor: (p) => formatarDataBr(p.dt_contrato) },
          { titulo: 'Associado', largura: 195, valor: (p) => p.associado },
          { titulo: 'Placa', largura: 70, valor: (p) => p.placa },
          { titulo: 'Consultor', largura: 180, valor: (p) => p.consultorNome },
        ],
        placasEquipe,
        { linhaTotal: { rotulo: 'Total de placas ativadas', valor: String(placasEquipe.length) } }
      )
      doc.moveDown(0.4)
    }
  }

  rodape(doc)
  doc.end()
  return fim
}
