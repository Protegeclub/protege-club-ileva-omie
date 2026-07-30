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

// Só as categorias de despesa (a comissão do consultor é sempre uma saída de caixa) — usado na
// tela de configuração (Gestor escolhe uma vez, ver omie_configuracao). Categoria financeira é
// decisão contábil do cliente, o sistema não deveria supor uma.
export async function listarCategoriasDespesaOmie(): Promise<CategoriaOmie[]> {
  const resposta = await omieCall<{ categoria_cadastro: CategoriaOmie[] }>('geral/categorias', {
    call: 'ListarCategorias',
    param: [{ pagina: 1, registros_por_pagina: 500, filtrar_apenas_ativo: 'S' }],
  })
  return resposta.categoria_cadastro.filter((c) => c.conta_despesa === 'S')
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
  dataPrevisao?: string // "Data da Previsão de Pagamento" — campo obrigatório na Omie; sem
  // negociação de prazo próprio, usamos a mesma data do vencimento (ver chamador).
  codigoCategoria: string
  idContaCorrente: number
  codigoLancamentoIntegracao: string
  observacao?: string
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
        data_previsao: p.dataPrevisao ?? p.dataVencimento,
        valor_documento: p.valor,
        codigo_categoria: p.codigoCategoria,
        id_conta_corrente: p.idContaCorrente,
        observacao: p.observacao ?? '',
      },
    ],
  })
}
