import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { env } from '@/lib/env'

// Convenção real da API da Omie: endpoints por "call" dentro de um recurso, autenticação por
// app_key/app_secret no corpo (não por header). Documentado em:
// https://app.omie.com.br/api/v1/financas/contapagar/ (e recursos irmãos abaixo).

interface OmieCallParams {
  call: string
  param: Record<string, unknown>[]
}

export async function omieCall<T>(resource: string, params: OmieCallParams): Promise<T> {
  const res = await fetch(`${env.omie.baseUrl}/${resource}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      call: params.call,
      app_key: env.omie.appKey,
      app_secret: env.omie.appSecret,
      param: params.param,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro na API da Omie em ${resource}/${params.call} (${res.status}): ${body}`)
  }

  return res.json() as Promise<T>
}

export interface ClienteOmie {
  codigo_cliente_omie: number
  codigo_cliente_integracao: string
  razao_social: string
  nome_fantasia: string
  cnpj_cpf: string
  tags?: { tag: string }[]
}

interface ListarClientesResposta {
  pagina: number
  total_de_paginas: number
  clientes_cadastro: ClienteOmie[]
}

// Pagina até o fim — confirmado com dado real (27/07/2026): a conta tem ~3.900 clientes/
// fornecedores cadastrados, então isso são ~8 chamadas com 500 por página, não milhares.
// Cacheado por alguns minutos (ver vinculo.ts) porque só é usado pra sugerir vínculo, não
// precisa ser em tempo real.
export async function listarTodosClientesOmie(): Promise<ClienteOmie[]> {
  const todos: ClienteOmie[] = []
  let pagina = 1
  while (true) {
    const resposta = await omieCall<ListarClientesResposta>('geral/clientes', {
      call: 'ListarClientes',
      param: [{ pagina, registros_por_pagina: 500, apenas_importado_api: 'N' }],
    })
    todos.push(...resposta.clientes_cadastro)
    if (pagina >= resposta.total_de_paginas) break
    pagina++
  }
  return todos
}

export interface CategoriaOmie {
  codigo: string
  descricao: string
  conta_despesa: 'S' | 'N'
  conta_receita: 'S' | 'N'
}

interface ListarCategoriasResposta {
  pagina: number
  total_de_paginas: number
  categoria_cadastro: CategoriaOmie[]
}

// Só as categorias de despesa (a comissão do consultor é sempre uma saída de caixa) — usado na
// tela de configuração (Gestor escolhe uma vez, ver omie_configuracao). Categoria financeira é
// decisão contábil do cliente, o sistema não deveria supor uma.
//
// Pagina até o fim (mesmo padrão de listarTodosClientesOmie acima) — bug real encontrado em
// 10/08/2026: só buscava a página 1 (500 registros_por_pagina, mas a Omie limita ~100 por
// página de verdade); a conta tem 156 categorias no total, então a página 2 inteira ficava de
// fora do dropdown — "Comissões s/ adesões e mensalidades" (2.09.99), que o cliente precisa
// usar, estava exatamente nela.
export async function listarCategoriasDespesaOmie(): Promise<CategoriaOmie[]> {
  const todas: CategoriaOmie[] = []
  let pagina = 1
  while (true) {
    const resposta = await omieCall<ListarCategoriasResposta>('geral/categorias', {
      call: 'ListarCategorias',
      param: [{ pagina, registros_por_pagina: 500, filtrar_apenas_ativo: 'S' }],
    })
    todas.push(...resposta.categoria_cadastro)
    if (pagina >= resposta.total_de_paginas) break
    pagina++
  }
  return todas.filter((c) => c.conta_despesa === 'S')
}

export interface ContaCorrenteOmie {
  nCodCC: number
  descricao: string
  tipo: string
  codigo_banco: string
}

export async function listarContasCorrentesOmie(): Promise<ContaCorrenteOmie[]> {
  const resposta = await omieCall<{ ListarContasCorrentes: ContaCorrenteOmie[] }>('geral/contacorrente', {
    call: 'ListarContasCorrentes',
    param: [{ pagina: 1, registros_por_pagina: 100, apenas_importado_api: 'N' }],
  })
  return resposta.ListarContasCorrentes
}

export interface IncluirContaPagarParams {
  codigoClienteOmie: number
  valor: number
  dataVencimento: string // formato DD/MM/AAAA (padrão Omie)
  dataEmissao?: string // "Data de Emissão" — pedido do cliente (10/08/2026): sempre o último dia
  // do mês apurado, não a data em que o Gestor efetivamente clica em enviar. Confirmado na
  // documentação oficial da Omie que esse campo existe em IncluirContaPagar, formato DD/MM/AAAA.
  dataPrevisao?: string // "Data da Previsão de Pagamento" — campo obrigatório na Omie; sem
  // negociação de prazo próprio, usamos a mesma data do vencimento (ver chamador).
  codigoCategoria: string
  idContaCorrente: number
  codigoLancamentoIntegracao: string
  observacao?: string
  // Chave PIX do consultor (pedido do cliente, 15/08/2026) — preenche o título já com a forma de
  // pagamento certa, ver comentário abaixo sobre cnab_integracao_bancaria.
  chavePix?: string
}

export interface IncluirContaPagarResposta {
  codigo_lancamento_omie: number
  codigo_lancamento_integracao: string
  codigo_status: string
  descricao_status: string
}

// Escreve de verdade no financeiro do cliente — NUNCA chamar automaticamente. Só a partir de uma
// ação explícita do Gestor (ver web/src/app/gestor/omie/actions.ts), sempre com
// codigo_lancamento_integracao único (evita duplicar ao reprocessar) e sempre registrando o
// resultado em auditoria_omie antes de considerar concluído.
//
// Payload conferido contra a documentação real da Omie (developer.omie.com.br,
// financas/contapagar) em 29/07/2026 — nomes de campo que já erraram uma vez de memória antes
// de eu checar: é `id_conta_corrente` (não `codigo_conta_corrente`), `data_previsao` é
// obrigatório (não só `data_vencimento`), e a resposta traz `codigo_lancamento_omie` (não
// `codigo_lancamento`).
export async function incluirContaPagar(p: IncluirContaPagarParams): Promise<IncluirContaPagarResposta> {
  return omieCall<IncluirContaPagarResposta>('financas/contapagar', {
    call: 'IncluirContaPagar',
    param: [
      {
        codigo_lancamento_integracao: p.codigoLancamentoIntegracao,
        codigo_cliente_fornecedor: p.codigoClienteOmie,
        data_vencimento: p.dataVencimento,
        ...(p.dataEmissao ? { data_emissao: p.dataEmissao } : {}),
        data_previsao: p.dataPrevisao ?? p.dataVencimento,
        valor_documento: p.valor,
        codigo_categoria: p.codigoCategoria,
        id_conta_corrente: p.idContaCorrente,
        observacao: p.observacao ?? '',
        // Transferência por chave Pix (não é o mesmo que codigo_forma_pagamento="PIX", que é só
        // pra QR Code) — confirmado em documentação oficial da Omie (15/08/2026):
        // codigo_forma_pagamento="TRA" + finalidade_transferencia="01.3" exige a chave na tag
        // pix_qrcode (nome de campo reaproveitado pela própria Omie pra chave também, não só
        // QR Code de verdade). Ainda não testado ao vivo — testar com 1 envio real antes de
        // confiar pra todo mundo (mesmo cuidado do bug do anexo).
        ...(p.chavePix
          ? {
              cnab_integracao_bancaria: {
                codigo_forma_pagamento: 'TRA',
                finalidade_transferencia: '01.3',
                pix_qrcode: p.chavePix,
              },
            }
          : {}),
      },
    ],
  })
}

export interface ExcluirContaPagarResposta {
  codigo_lancamento_omie: number
  codigo_lancamento_integracao: string
  codigo_status: string
  descricao_status: string
}

// Remove o título inteiro do Contas a Pagar — pedido do cliente (15/08/2026), pra corrigir um
// envio feito por engano (ex.: vínculo de fornecedor errado) sem depender do suporte da Omie.
// Diferente de CancelarPagamento (que desfaria uma BAIXA/pagamento já registrado) — este sistema
// nunca chama LancarPagamento, então o título criado por IncluirContaPagar está sempre em aberto
// do nosso lado; exclusão é a operação certa. Estrutura conferida via documentação oficial
// (15/08/2026) — ainda não testada ao vivo, testar com 1 caso real antes de confiar amplamente
// (mesmo cuidado do anexo/chave PIX).
export async function excluirContaPagar(codigoLancamentoOmie: number): Promise<ExcluirContaPagarResposta> {
  return omieCall<ExcluirContaPagarResposta>('financas/contapagar', {
    call: 'ExcluirContaPagar',
    param: [
      {
        conta_pagar_cadastro_chave: {
          codigo_lancamento_omie: codigoLancamentoOmie,
        },
      },
    ],
  })
}

export interface IncluirAnexoParams {
  cCodIntAnexo: string
  cTabela: string // "conta-pagar" pro nosso caso — a Omie também suporta outras tabelas
  nId: number // codigo_lancamento_omie do título já criado
  cNomeArquivo: string
  cTipoArquivo?: string
  conteudo: Buffer
}

export interface IncluirAnexoResposta {
  nIdAnexo: number
  cCodStatus: string
  cDesStatus: string
}

// A Omie exige o conteúdo compactado em .zip e depois em base64, com o MD5 na tag cMd5 —
// confirmado com dado real (12/08/2026): MD5 do .zip BRUTO (antes do base64) sempre voltava
// "MD5 inválido" — a Omie recalcula sobre a STRING em base64 que efetivamente vai na tag
// cArquivo, não sobre os bytes brutos por trás dela (mesmo padrão usado no cMd5NFe da API de
// NF-e: hash sobre o conteúdo textual que é transmitido, não sobre um estágio intermediário).
// Não bloqueia o título em si: falha de anexo não deve derrubar o envio do contas a pagar, que
// já foi criado com sucesso antes desta chamada (ver chamador em lib/omie/contas-pagar.ts).
export async function incluirAnexo(p: IncluirAnexoParams): Promise<IncluirAnexoResposta> {
  const zip = new JSZip()
  zip.file(p.cNomeArquivo, p.conteudo)
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const cArquivo = zipBuffer.toString('base64')
  const cMd5 = createHash('md5').update(cArquivo, 'utf-8').digest('hex')

  return omieCall<IncluirAnexoResposta>('geral/anexo', {
    call: 'IncluirAnexo',
    param: [
      {
        cCodIntAnexo: p.cCodIntAnexo,
        cTabela: p.cTabela,
        nId: p.nId,
        cNomeArquivo: p.cNomeArquivo,
        cTipoArquivo: p.cTipoArquivo ?? 'pdf',
        cArquivo,
        cMd5,
      },
    ],
  })
}
