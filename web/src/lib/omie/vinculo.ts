import { unstable_cache } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { listarTodosClientesOmie, type ClienteOmie } from './client'

// Cacheado por 5min — a lista de clientes/fornecedores da Omie (~3.900 registros) não muda a
// ponto de precisar ser buscada a cada abertura da tela de vínculo, e evita 8 chamadas paginadas
// à API toda vez que o Gestor revisita a tela no mesmo fechamento.
export const listarTodosClientesOmieCacheado = unstable_cache(
  listarTodosClientesOmie,
  ['omie-todos-clientes'],
  { revalidate: 300 }
)

// NFD decompõe acentos em letra + marca separada (ex.: "é" → "e" + acento); o filtro seguinte
// (só a-z0-9/espaço) já descarta essa marca sozinho, sem precisar de uma regex de range Unicode
// à parte pra ela.
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

// Pontuação simples por sobreposição de palavras (não é fuzzy-match sofisticado — só o
// suficiente pra sugerir candidatos, o Gestor sempre confirma antes de valer). Cada palavra do
// nome do consultor que aparece no nome do cliente/fornecedor da Omie conta um ponto.
function pontuarSimilaridade(nomeConsultor: string, nomeOmie: string): number {
  const palavrasConsultor = normalizar(nomeConsultor).split(/\s+/).filter(Boolean)
  const palavrasOmie = new Set(normalizar(nomeOmie).split(/\s+/).filter(Boolean))
  if (palavrasConsultor.length === 0) return 0
  const comuns = palavrasConsultor.filter((p) => palavrasOmie.has(p)).length
  return comuns / palavrasConsultor.length
}

export interface SugestaoVinculo {
  cliente: ClienteOmie
  pontuacao: number
}

// Retorna os melhores candidatos (nome fantasia OU razão social, o que pontuar mais alto),
// ordenados por pontuação — o Gestor escolhe o certo (ou nenhum, e busca manualmente) na tela de
// revisão. Nunca vincula sozinho.
export function sugerirClientesOmie(
  nomeConsultor: string,
  clientes: ClienteOmie[],
  limite = 5
): SugestaoVinculo[] {
  return clientes
    .map((cliente) => ({
      cliente,
      pontuacao: Math.max(
        pontuarSimilaridade(nomeConsultor, cliente.razao_social || ''),
        pontuarSimilaridade(nomeConsultor, cliente.nome_fantasia || '')
      ),
    }))
    .filter((s) => s.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite)
}

export interface VinculoConfirmado {
  cod_consultor: number
  codigo_cliente_omie: number
  nome_omie: string
  confirmado_em: string
}

export async function buscarVinculosConfirmados(): Promise<Map<number, VinculoConfirmado>> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('consultor_omie_vinculo')
    .select('cod_consultor, codigo_cliente_omie, nome_omie, confirmado_em')
  return new Map((data ?? []).map((v) => [v.cod_consultor, v as VinculoConfirmado]))
}

export async function confirmarVinculo(
  codConsultor: number,
  codigoClienteOmie: number,
  nomeOmie: string,
  confirmadoPor: string
) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('consultor_omie_vinculo').upsert(
    {
      cod_consultor: codConsultor,
      codigo_cliente_omie: codigoClienteOmie,
      nome_omie: nomeOmie,
      confirmado_por: confirmadoPor,
      confirmado_em: new Date().toISOString(),
    },
    { onConflict: 'cod_consultor' }
  )
  if (error) throw new Error(`Erro ao salvar vínculo: ${error.message}`)
}
