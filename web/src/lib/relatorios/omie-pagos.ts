import type { PagamentoOmie, RelatorioPagosOmie, ResumoConsultorPago } from '@/lib/omie/relatorio-pagos'
import { criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape } from './pdf-utils'

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function rotuloPeriodoPagos(de?: string, ate?: string): string {
  if (de && ate) return `Período: ${dataBr(de)} a ${dataBr(ate)}`
  if (de) return `Período: a partir de ${dataBr(de)}`
  if (ate) return `Período: até ${dataBr(ate)}`
  return 'Período: todo o histórico'
}

// PDF "Consultores pagos via Omie" (pedido do cliente, 17/11/2026): resumo por consultor
// (quanto cada um recebeu no período) + detalhe título a título.
export async function gerarPdfPagosOmie(
  relatorio: RelatorioPagosOmie,
  de?: string,
  ate?: string
): Promise<Buffer> {
  const { doc, fim } = criarDocumento({ layout: 'landscape' })
  desenharCabecalho(doc, 'Consultores Pagos via Omie', ['ProtegeClub', rotuloPeriodoPagos(de, ate)])

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1F3B57').text(`Total lançado no Omie: ${formatarMoeda(relatorio.totalPago)}`)
  doc
    .fontSize(9.5)
    .font('Helvetica')
    .fillColor('#4A4A4A')
    .text(
      `${relatorio.qtdConsultores} consultor(es) · ${relatorio.pagamentos.length} título(s) a pagar criado(s) no Omie pelo sistema.`
    )
  doc.moveDown(0.8)

  if (relatorio.pagamentos.length === 0) {
    doc.fillColor('#7A7A7A').fontSize(10).text('Nenhum título enviado ao Omie neste período.')
    rodape(doc)
    doc.end()
    return fim
  }

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F3B57').text('Resumo por consultor')
  doc.moveDown(0.3)
  desenharTabela<ResumoConsultorPago>(
    doc,
    [
      { titulo: 'Consultor', largura: 420, valor: (r) => `${r.nomeConsultor} #${r.cod_consultor}` },
      { titulo: 'Títulos', largura: 100, alinhar: 'right', valor: (r) => String(r.qtdTitulos) },
      { titulo: 'Total', largura: 150, alinhar: 'right', valor: (r) => formatarMoeda(r.total) },
    ],
    relatorio.porConsultor,
    { linhaTotal: { rotulo: 'Total geral', valor: formatarMoeda(relatorio.totalPago) } }
  )
  doc.moveDown(1)

  if (doc.y > doc.page.height - 150) doc.addPage()
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F3B57').text('Detalhe dos pagamentos')
  doc.moveDown(0.3)
  desenharTabela<PagamentoOmie>(
    doc,
    [
      { titulo: 'Consultor', largura: 190, valor: (p) => `${p.nomeConsultor} #${p.cod_consultor}` },
      { titulo: 'Competência', largura: 70, valor: (p) => `${String(p.mes).padStart(2, '0')}/${p.ano}` },
      { titulo: 'Valor', largura: 90, alinhar: 'right', valor: (p) => formatarMoeda(p.valor) },
      {
        titulo: 'Registrado em',
        largura: 85,
        valor: (p) => new Date(p.registradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      },
      { titulo: 'Fornecedor Omie', largura: 200, valor: (p) => p.fornecedorOmie ?? '—' },
      { titulo: 'Chave PIX', largura: 127, valor: (p) => p.chavePix ?? '—' },
    ],
    relatorio.pagamentos
  )

  rodape(doc)
  doc.end()
  return fim
}
