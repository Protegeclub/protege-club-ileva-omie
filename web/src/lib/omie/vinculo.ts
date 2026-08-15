import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { listarTodosClientesOmie, type ClienteOmie } from './client'

const DURACAO_CACHE_MS = 30 * 60 * 1000

let cache: { dados: ClienteOmie[]; expiraEm: number } | null = null
let buscaEmAndamento: Promise<ClienteOmie[]> | null = null

async function lerCacheSupabase(): Promise<{ dados: ClienteOmie[]; atualizadoEm: number } | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('omie_clientes_cache')
    .select('dados, atualizado_em')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return null
  return { dados: data.dados as ClienteOmie[], atualizadoEm: new Date(data.atualizado_em).getTime() }
}

async function gravarCacheSupabase(dados: ClienteOmie[]) {
  const admin = createSupabaseAdminClient()
  await admin
    .from('omie_clientes_cache')
    .upsert({ id: 1, dados, atualizado_em: new Date().toISOString() })
}

// Cacheado por 30min, em duas camadas: memória do processo (rápido, mas some a cada instância
// fria da Vercel) + tabela omie_clientes_cache no Supabase (compartilhada entre instâncias). A
// lista de clientes/fornecedores da Omie (~3.900 registros, ~4.9MB serializada) não muda a ponto
// de precisar ser buscada a cada abertura da tela de vínculo, e buscar isso na Omie é lento (~8
// chamadas paginadas sequenciais, 10-40s de espera visível pro Gestor) — sem a camada
// compartilhada, toda instância fria paga esse custo de novo, mesmo dentro da mesma janela de
// 30min. Não usa unstable_cache: o Data Cache da Vercel rejeita entradas acima de 2MB (falha
// silenciosa, só um warning no log), então esse cache nunca gravava de fato. A dedupe de busca em
// andamento evita rodar a paginação duas vezes ao mesmo tempo na mesma instância; os fallbacks
// pro cache (local ou remoto, mesmo expirado) cobrem o caso de a Omie rejeitar como "consumo
// redundante" — melhor servir dado com alguns minutos de atraso do que derrubar a tela.
export async function listarTodosClientesOmieCacheado(): Promise<ClienteOmie[]> {
  if (cache && cache.expiraEm > Date.now()) return cache.dados
  if (buscaEmAndamento) return buscaEmAndamento

  buscaEmAndamento = (async () => {
    const remoto = await lerCacheSupabase().catch(() => null)
    if (remoto && Date.now() - remoto.atualizadoEm < DURACAO_CACHE_MS) {
      cache = { dados: remoto.dados, expiraEm: remoto.atualizadoEm + DURACAO_CACHE_MS }
      return remoto.dados
    }

    try {
      const dados = await listarTodosClientesOmie()
      cache = { dados, expiraEm: Date.now() + DURACAO_CACHE_MS }
      gravarCacheSupabase(dados).catch((e) => console.error('Falha ao gravar cache de clientes Omie:', e))
      return dados
    } catch (e) {
      if (cache) return cache.dados
      if (remoto) return remoto.dados
      throw e
    }
  })()

  try {
    return await buscaEmAndamento
  } finally {
    buscaEmAndamento = null
  }
}

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
  chave_pix: string | null
}

export async function buscarVinculosConfirmados(): Promise<Map<number, VinculoConfirmado>> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('consultor_omie_vinculo')
    .select('cod_consultor, codigo_cliente_omie, nome_omie, confirmado_em, chave_pix')
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

// Chave PIX do consultor — guardada uma vez (ver 0012_omie_chave_pix.sql), reaproveitada em todo
// envio futuro; editável a qualquer momento pela tela. Só faz sentido depois do vínculo já
// confirmado (a linha em consultor_omie_vinculo precisa existir).
export async function salvarChavePix(codConsultor: number, chavePix: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('consultor_omie_vinculo')
    .update({ chave_pix: chavePix })
    .eq('cod_consultor', codConsultor)
    .select('cod_consultor')
    .maybeSingle()

  if (error) throw new Error(`Erro ao salvar chave PIX: ${error.message}`)
  if (!data) throw new Error('Confirme o vínculo com um cliente/fornecedor do Omie antes de definir a chave PIX.')
}
