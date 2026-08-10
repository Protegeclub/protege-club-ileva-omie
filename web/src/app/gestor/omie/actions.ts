'use server'

import { revalidatePath } from 'next/cache'
import { listarTodosConsultores } from '@/lib/ileva/api'
import {
  listarCategoriasDespesaOmie,
  listarContasCorrentesOmie,
  type CategoriaOmie,
  type ContaCorrenteOmie,
} from '@/lib/omie/client'
import { enviarContaPagar } from '@/lib/omie/contas-pagar'
import {
  buscarVinculosConfirmados,
  confirmarVinculo,
  listarTodosClientesOmieCacheado,
  sugerirClientesOmie,
  type SugestaoVinculo,
} from '@/lib/omie/vinculo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Autorizacao = { userId: string } | { erro: string }

async function autorizarGestor(): Promise<Autorizacao> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    return { erro: 'Sem permissão.' }
  }

  return { userId: userData.user.id }
}

export interface LinhaOmie {
  cod_consultor: number
  nomeConsultor: string
  apuracaoId: string | null
  totalLiquido: number
  vinculo: { codigo_cliente_omie: number; nome_omie: string } | null
  sugestoes: SugestaoVinculo[]
  statusEnvio: 'nao_enviado' | 'enviado' | 'erro'
}

export interface ConfiguracaoOmie {
  codigoCategoria: string | null
  descricaoCategoria: string | null
  codigoContaCorrente: number | null
  descricaoContaCorrente: string | null
}

// Cruza: apurações do mês (quem já tem total líquido pra pagar) + vínculo confirmado (se algum
// dia foi confirmado antes) + sugestão por nome (pros que ainda não têm vínculo) + status de
// envio (auditoria_omie, pra não sugerir reenviar quem já foi enviado com sucesso).
export async function buscarDadosOmiePeriodo(
  ano: number,
  mes: number
): Promise<
  { linhas: LinhaOmie[]; configuracao: ConfiguracaoOmie; avisoSugestoes?: string } | { erro: string }
> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { erro: auth.erro }

  const admin = createSupabaseAdminClient()

  // A busca de auditoria depende dos ids de apuração, então essa consulta roda primeiro; o
  // resto (vínculos, clientes da Omie, configuração) não depende dela e roda em paralelo.
  const { data: apuracoes } = await admin
    .from('apuracoes_mensais')
    .select('id, cod_consultor, total_liquido, detalhe')
    .eq('ano', ano)
    .eq('mes', mes)
    .gt('total_liquido', 0)

  const apuracoesValidas = (apuracoes ?? []) as {
    id: string
    cod_consultor: number
    total_liquido: number
    detalhe: { nomeConsultor?: string } | null
  }[]
  const idsApuracao = apuracoesValidas.map((a) => a.id)

  // A lista de clientes da Omie só alimenta a sugestão automática de vínculo por nome — um
  // extra, não o núcleo da tela (ver apurações + confirmar envio). Se a Omie estiver
  // indisponível ou bloqueando por "consumo redundante", a tela inteira não pode cair por isso:
  // aqui ela degrada pra sugestões vazias (o Gestor ainda busca manualmente) em vez de derrubar
  // a página.
  let avisoSugestoes: string | undefined
  const [vinculos, clientesOmie, { data: auditoriaReal }, { data: configRow }] = await Promise.all([
    buscarVinculosConfirmados(),
    listarTodosClientesOmieCacheado().catch((e) => {
      avisoSugestoes = 'Sugestões automáticas de vínculo indisponíveis agora (Omie não respondeu). Você ainda pode buscar manualmente.'
      console.error('Falha ao buscar clientes da Omie:', e)
      return [] as Awaited<ReturnType<typeof listarTodosClientesOmieCacheado>>
    }),
    idsApuracao.length > 0
      ? admin.from('auditoria_omie').select('apuracao_id, status').in('apuracao_id', idsApuracao)
      : Promise.resolve({ data: [] as { apuracao_id: string | null; status: string }[] }),
    admin.from('omie_configuracao').select('*').eq('id', 1).maybeSingle(),
  ])

  const statusPorApuracao = new Map<string, string>()
  for (const a of auditoriaReal ?? []) {
    if (!a.apuracao_id) continue
    // 'enviado' tem prioridade sobre 'erro'/'pendente' se houver mais de uma tentativa.
    if (a.status === 'enviado' || !statusPorApuracao.has(a.apuracao_id)) {
      statusPorApuracao.set(a.apuracao_id, a.status)
    }
  }

  const linhas: LinhaOmie[] = apuracoesValidas.map((a) => {
    const vinculo = vinculos.get(a.cod_consultor) ?? null
    const nomeConsultor = a.detalhe?.nomeConsultor ?? `Consultor #${a.cod_consultor}`
    const status = statusPorApuracao.get(a.id)
    return {
      cod_consultor: a.cod_consultor,
      nomeConsultor,
      apuracaoId: a.id,
      totalLiquido: a.total_liquido,
      vinculo: vinculo ? { codigo_cliente_omie: vinculo.codigo_cliente_omie, nome_omie: vinculo.nome_omie } : null,
      sugestoes: vinculo ? [] : sugerirClientesOmie(nomeConsultor, clientesOmie, 3),
      statusEnvio: status === 'enviado' ? 'enviado' : status === 'erro' ? 'erro' : 'nao_enviado',
    }
  })

  linhas.sort((a, b) => b.totalLiquido - a.totalLiquido)

  return {
    linhas,
    configuracao: {
      codigoCategoria: configRow?.codigo_categoria ?? null,
      descricaoCategoria: configRow?.descricao_categoria ?? null,
      codigoContaCorrente: configRow?.codigo_conta_corrente ?? null,
      descricaoContaCorrente: configRow?.descricao_conta_corrente ?? null,
    },
    ...(avisoSugestoes ? { avisoSugestoes } : {}),
  }
}

export async function buscarOpcoesConfiguracao(): Promise<
  { categorias: CategoriaOmie[]; contas: ContaCorrenteOmie[] } | { erro: string }
> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { erro: auth.erro }

  const [categorias, contas] = await Promise.all([listarCategoriasDespesaOmie(), listarContasCorrentesOmie()])
  return { categorias, contas }
}

export async function salvarConfiguracaoOmieAction(
  codigoCategoria: string,
  descricaoCategoria: string,
  codigoContaCorrente: number,
  descricaoContaCorrente: string
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('omie_configuracao').upsert({
    id: 1,
    codigo_categoria: codigoCategoria,
    descricao_categoria: descricaoCategoria,
    codigo_conta_corrente: codigoContaCorrente,
    descricao_conta_corrente: descricaoContaCorrente,
    atualizado_por: auth.userId,
    atualizado_em: new Date().toISOString(),
  })

  if (error) return { ok: false, erro: error.message }
  revalidatePath('/gestor/omie')
  return { ok: true }
}

// "Buscar manualmente" na tela de revisão, quando nenhuma sugestão automática bate — filtra a
// mesma lista cacheada usada nas sugestões, sem mandar os ~3.900 registros inteiros pro
// navegador.
export async function buscarClientesOmieAction(
  termo: string
): Promise<{ codigo_cliente_omie: number; nome: string; cnpj_cpf: string }[] | { erro: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { erro: auth.erro }
  if (termo.trim().length < 3) return []

  const clientes = await listarTodosClientesOmieCacheado()
  const termoNormalizado = termo.trim().toLowerCase()
  return clientes
    .filter(
      (c) =>
        c.razao_social?.toLowerCase().includes(termoNormalizado) ||
        c.nome_fantasia?.toLowerCase().includes(termoNormalizado) ||
        c.cnpj_cpf?.replace(/\D/g, '').includes(termoNormalizado.replace(/\D/g, ''))
    )
    .slice(0, 20)
    .map((c) => ({
      codigo_cliente_omie: c.codigo_cliente_omie,
      nome: c.razao_social || c.nome_fantasia,
      cnpj_cpf: c.cnpj_cpf,
    }))
}

export async function confirmarVinculoAction(
  codConsultor: number,
  codigoClienteOmie: number,
  nomeOmie: string
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  try {
    await confirmarVinculo(codConsultor, codigoClienteOmie, nomeOmie, auth.userId)
    revalidatePath('/gestor/omie')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido.' }
  }
}

// A ação que de fato escreve no financeiro do cliente — exige vínculo E configuração já
// resolvidos (ver enviarContaPagar em lib/omie/contas-pagar.ts, que também checa idempotência
// contra auditoria_omie antes de chamar a Omie de verdade).
export async function enviarContaPagarAction(
  apuracaoId: string,
  codConsultor: number,
  valor: number,
  dataVencimentoBr: string
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  const admin = createSupabaseAdminClient()
  const [{ data: vinculo }, { data: config }] = await Promise.all([
    admin
      .from('consultor_omie_vinculo')
      .select('codigo_cliente_omie')
      .eq('cod_consultor', codConsultor)
      .maybeSingle(),
    admin.from('omie_configuracao').select('*').eq('id', 1).maybeSingle(),
  ])

  if (!vinculo) {
    return { ok: false, erro: 'Consultor sem vínculo confirmado com um cliente/fornecedor do Omie.' }
  }
  if (!config?.codigo_categoria || !config?.codigo_conta_corrente) {
    return { ok: false, erro: 'Configure a categoria e a conta corrente do Omie antes de enviar.' }
  }

  try {
    await enviarContaPagar({
      apuracaoId,
      codConsultor,
      codigoClienteOmie: vinculo.codigo_cliente_omie,
      valor,
      dataVencimento: dataVencimentoBr,
      codigoCategoria: config.codigo_categoria,
      idContaCorrente: config.codigo_conta_corrente,
      criadoPor: auth.userId,
    })
    revalidatePath('/gestor/omie')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido ao enviar para o Omie.' }
  }
}

// Só pra popular o filtro de consultor/nome na tela, reaproveitando o cache de 60s que já existe
// em listarTodosConsultores (mesma fonte usada em /gestor/consultores).
export async function listarConsultoresAtivosAction() {
  const consultores = await listarTodosConsultores()
  return consultores.filter((c) => c.situacao === 'Ativo')
}
