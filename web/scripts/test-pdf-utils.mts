// Fixture sintética pra validar pdf-utils.ts isolado (sem API/banco) — mesmo espírito de
// test-apuracao.mts. Gera PDFs de teste com casos de borda deliberados: nome bem longo, campo
// nulo, tabela de várias páginas, tabela vazia, e as duas orientações.
//
// Pré-requisito: npm install --no-save tsx
// Uso: npx tsx scripts/test-pdf-utils.mts <pasta-de-saida>
import { writeFileSync } from 'node:fs'
import { criarDocumento, desenharCabecalho, desenharTabela, formatarMoeda, rodape } from '../src/lib/relatorios/pdf-utils.ts'

const pastaSaida = process.argv[2] ?? '.'

interface ItemTeste {
  associado: string
  placa: string
  consultor: string
  referencia: string | null
  valor: number
}

const NOME_LONGO = 'ASSOCIACAO COMERCIAL E INDUSTRIAL DE PROTECAO VEICULAR DO SUDOESTE GOIANO LTDA ME'

async function gerar(nome: string, opcoes: { layout?: 'portrait' | 'landscape' }, itens: ItemTeste[]) {
  const { doc, fim } = criarDocumento(opcoes)
  desenharCabecalho(doc, `Teste — ${nome}`, ['Fixture sintética', 'Sem dado real'])
  desenharTabela<ItemTeste>(
    doc,
    [
      { titulo: 'Associado', largura: opcoes.layout === 'landscape' ? 230 : 140, valor: (i) => i.associado },
      { titulo: 'Placa', largura: 70, valor: (i) => i.placa },
      { titulo: 'Consultor', largura: opcoes.layout === 'landscape' ? 190 : 120, valor: (i) => i.consultor },
      { titulo: 'Referência', largura: 80, valor: (i) => i.referencia ?? '—' },
      {
        titulo: 'Valor',
        largura: 75,
        alinhar: 'right',
        valor: (i) => formatarMoeda(i.valor),
      },
    ],
    itens,
    { linhaTotal: { rotulo: 'Total', valor: formatarMoeda(itens.reduce((s, i) => s + i.valor, 0)) } }
  )
  rodape(doc)
  doc.end()
  const buffer = await fim
  const caminho = `${pastaSaida}/teste-pdf-${nome}.pdf`
  writeFileSync(caminho, buffer)
  console.log(`OK: ${caminho} (${buffer.length} bytes)`)
}

// 1. Nome longo + referência nula — portrait
await gerar('nome-longo-portrait', {}, [
  { associado: NOME_LONGO, placa: 'ABC1D23', consultor: 'João da Silva', referencia: null, valor: 123.45 },
  { associado: 'Maria Pequena', placa: 'XYZ9F87', consultor: 'Ana Souza', referencia: '2026-07', valor: 50 },
])

// 2. Mesmo caso, landscape — pra comparar a diferença de wrap
await gerar('nome-longo-landscape', { layout: 'landscape' }, [
  { associado: NOME_LONGO, placa: 'ABC1D23', consultor: 'João da Silva', referencia: null, valor: 123.45 },
  { associado: 'Maria Pequena', placa: 'XYZ9F87', consultor: 'Ana Souza', referencia: '2026-07', valor: 50 },
])

// 3. Tabela vazia
await gerar('vazia', {}, [])

// 4. Multi-página (60 linhas, testa quebra de página + repetição de cabeçalho)
const muitasLinhas: ItemTeste[] = Array.from({ length: 60 }, (_, i) => ({
  associado: `Associado Número ${i + 1}`,
  placa: `PLC${String(i).padStart(4, '0')}`,
  consultor: `Consultor ${(i % 5) + 1}`,
  referencia: i % 3 === 0 ? null : `2026-0${(i % 9) + 1}`,
  valor: 10 + i,
}))
await gerar('multipagina', { layout: 'landscape' }, muitasLinhas)

console.log('\nTodos os PDFs de teste gerados — abrir manualmente pra inspeção visual.')
