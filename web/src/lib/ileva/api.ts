import { unstable_cache } from 'next/cache'
import { ilevaGet } from '@/lib/ileva/client'
import type { BoletoDetalhe, BoletoResumo, Consultor, SituacaoBoleto, Veiculo } from '@/types/domain'

// A API do Ileva retorna 400 ("Por favor informe o início da paginação") se
// inicio_paginacao/quantidade_por_pagina não forem enviados — por isso são obrigatórios aqui,
// mesmo a API tratando como opcionais na doc.
interface Paginacao {
  inicio_paginacao: number
  quantidade_por_pagina: number
}

export async function listarConsultores(
  params: Paginacao & {
    cod_regional?: number
    cod_equipe?: number
  }
): Promise<{ total_encontrados: number; consultores: Consultor[] }> {
  return ilevaGet('/consultor/listar', { ...params })
}

// Versão sem cache — SEMPRE usar esta (nunca a `buscarConsultor` cacheada abaixo) em qualquer
// lugar que persista o resultado (ex.: `lib/apuracao/mensal.ts`, salva `cod_equipe`/nome no mês
// apurado) ou que use o dado pra agir sobre ele (ex.: convite por e-mail em
// `gestor/acessos/actions.ts` — mandar pro e-mail errado por causa de um cache de 60s seria bem
// pior do que qualquer ganho de velocidade). Cache só é seguro para exibição transitória em tela.
export async function buscarConsultorSemCache(params: {
  cod_consultor?: number
  cpfCnpj?: string
}): Promise<{ consultor: Consultor }> {
  return ilevaGet('/consultor/buscar', { ...params })
}

// Cacheada por 60s — só para exibição em tela (toggle "ver equipe" do painel Consultor/Gestor e
// do PDF, que só usam nome/cod_equipe pra mostrar/agrupar, nunca gravam nada no banco nem tomam
// nenhuma ação com o resultado). Sem cache, cada clique de aba com o toggle ligado pagava mais
// uma chamada ao vivo no Ileva só pra descobrir a equipe de alguém que raramente muda de equipe.
export const buscarConsultor = unstable_cache(buscarConsultorSemCache, ['buscar-consultor'], {
  revalidate: 60,
})

export async function listarVeiculos(
  params: Paginacao & {
    cod_consultor?: number
    possui_rastreador?: 0 | 1 // atenção: inteiro na query, string "Sim"/"Não" só na resposta
    mostrar_beneficios?: 0 | 1
    cod_situacao?: number
  }
): Promise<{ total_encontrados: number; veiculos: Veiculo[] }> {
  return ilevaGet('/veiculo/listar', { ...params })
}

export async function listarCobrancasPorVeiculo(
  params: Paginacao & {
    cod_veiculo?: number
    cod_associado?: number
    situacao_boleto?: SituacaoBoleto
    dt_pagamento_de?: string // formato YYYY-MM-DD
    dt_pagamento_ate?: string
    dt_vencimento_de?: string
    dt_vencimento_ate?: string
  }
): Promise<{ total_encontrados: number; boletos: BoletoResumo[] }> {
  return ilevaGet('/cobranca/listar-associado-veiculo', { ...params })
}

export async function buscarCobranca(params: {
  cod_cobranca: number
}): Promise<{ boleto: BoletoDetalhe }> {
  return ilevaGet('/cobranca/buscar', { ...params })
}

export async function listarBeneficios(params: Paginacao) {
  return ilevaGet<{
    total_encontrados: number
    beneficios: { cod_beneficio: number; nome: string; calculo: string; valor: string }[]
  }>('/beneficio', { ...params })
}

// Percorre todas as páginas — hoje são ~245 consultores no total, então isso é uma chamada
// rápida (1-2 páginas), bem diferente do problema de escala visto em listarTodosVeiculosDoConsultor
// (web/src/lib/apuracao/mensal.ts), onde um único consultor pode ter centenas de veículos.
async function listarTodosConsultoresSemCache(): Promise<Consultor[]> {
  const tamanhoPagina = 200
  let inicio = 0
  const todos: Consultor[] = []

  while (true) {
    const { total_encontrados, consultores } = await listarConsultores({
      inicio_paginacao: inicio,
      quantidade_por_pagina: tamanhoPagina,
    })
    todos.push(...consultores)
    inicio += tamanhoPagina
    if (inicio >= total_encontrados || consultores.length === 0) break
  }

  return todos
}

// Cacheado por 60s (`unstable_cache` do Next, persiste entre requests/instâncias na Vercel) — o
// cadastro de consultores muda raramente (contratação/desligamento), mas essa função era chamada
// de novo do zero (2 chamadas HTTP reais ao Ileva) em toda navegação do painel Gestor, inclusive
// só pra ordenar uma coluna ou trocar o filtro de equipe — isso que dava a sensação de "sistema
// lento" reportada em 18/07/2026. Sem cache, cada clique pagava essa latência de novo.
export const listarTodosConsultores = unstable_cache(
  listarTodosConsultoresSemCache,
  ['listar-todos-consultores'],
  { revalidate: 60 }
)

// Nomes de equipe distintos, ordenados — mesmo dedupe que já existia solto em
// gestor/consultores/page.tsx e gestor/acessos/page.tsx (unificado aqui pra não repetir uma
// 3ª vez na página de Relatórios).
export function listarEquipesDisponiveis(itens: { equipe: string }[]): string[] {
  return Array.from(new Set(itens.map((i) => i.equipe).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}
