'use server'

import { revalidatePath } from 'next/cache'
import { listarTodosConsultores } from '@/lib/ileva/api'
import {
  listarCategoriasDespesaOmie,
  listarContasCorrentesOmie,
  type CategoriaOmie,
  type ContaCorrenteOmie,
} from '@/lib/omie/client'
import { enviarContaPagar, estornarContaPagar } from '@/lib/omie/contas-pagar'
import {
  buscarVinculosConfirmados,
  confirmarVinculo,
  listarTodosClientesOmieCacheado,
  salvarChavePix,
  sugerirClientesOmie,
  type SugestaoVinculo,
} from '@/lib/omie/vinculo'
import { gerarPdfDashboard } from '@/lib/relatorios/consultor'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Último dia do mês apurado, formato DD/MM/AAAA (padrão Omie) — pedido do cliente (10/08/2026):
// a "Data de Emissão" no Omie deve ser sempre essa data, não o dia em que o Gestor efetivamente
// clica em enviar. Mesmo truque de "dia 0 do mês seguinte" já usado em lib/apuracao/mensal.ts
// (intervaloMes).
function calcularUltimoDiaMesBr(ano: number, mes: number): string {
  const data = new Date(ano, mes, 0)
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${data.getFullYear()}`
}

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
  chavePix: string | null
  sugestoes: SugestaoVinculo[]
  statusEnvio: 'nao_enviado' | 'enviado' | 'erro' | 'estornado'
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
    // 'enviado' tem prioridade sobre 'erro'/'pendente'/'estornado' se houver mais de uma
    // tentativa (ex.: reenviado com sucesso depois de um estorno).
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
      chavePix: vinculo?.chave_pix ?? null,
      sugestoes: vinculo ? [] : sugerirClientesOmie(nomeConsultor, clientesOmie, 3),
      statusEnvio:
        status === 'enviado' ? 'enviado' : status === 'erro' ? 'erro' : status === 'estornado' ? 'estornado' : 'nao_enviado',
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
// contra auditoria_omie antes de chamar a Omie de verdade). Também monta e anexa o relatório
// (dashboard completo, sem inadimplentes) e calcula a Data de Emissão como o último dia do mês
// apurado — pedidos do cliente, 10/08/2026.
export async function enviarContaPagarAction(
  apuracaoId: string,
  codConsultor: number,
  valor: number,
  dataVencimentoBr: string
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  const admin = createSupabaseAdminClient()
  const [{ data: vinculo }, { data: config }, { data: apuracao }] = await Promise.all([
    admin
      .from('consultor_omie_vinculo')
      .select('codigo_cliente_omie, chave_pix')
      .eq('cod_consultor', codConsultor)
      .maybeSingle(),
    admin.from('omie_configuracao').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('apuracoes_mensais')
      .select(
        'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_bonus_nivel, detalhe'
      )
      .eq('id', apuracaoId)
      .maybeSingle(),
  ])

  if (!vinculo) {
    return { ok: false, erro: 'Consultor sem vínculo confirmado com um cliente/fornecedor do Omie.' }
  }
  if (!config?.codigo_categoria || !config?.codigo_conta_corrente) {
    return { ok: false, erro: 'Configure a categoria e a conta corrente do Omie antes de enviar.' }
  }
  if (!vinculo.chave_pix) {
    return { ok: false, erro: 'Defina a chave PIX do consultor antes de enviar.' }
  }
  if (!apuracao) {
    return { ok: false, erro: 'Apuração não encontrada.' }
  }

  const nomeConsultor = apuracao.detalhe?.nomeConsultor ?? `Consultor #${codConsultor}`

  // Falha ao montar o PDF não pode impedir o pagamento — segue sem anexo, só loga.
  let anexo: { conteudo: Buffer; nomeArquivo: string } | undefined
  try {
    const pdf = await gerarPdfDashboard(
      nomeConsultor,
      apuracao.ano,
      apuracao.mes,
      {
        totalAdesoes: apuracao.detalhe?.adesoes?.length ?? 0,
        totalEquipe: 0,
        totalPremiacaoIndividual: apuracao.total_premiacao_individual,
        totalPremiacaoEquipe: apuracao.total_premiacao_equipe,
        totalAdesao: apuracao.total_adesao,
        totalRecorrencia: apuracao.total_recorrencia,
        totalDescontoRastreador: apuracao.total_desconto_rastreador,
        totalComissaoGerencial: apuracao.total_comissao_gerencial,
        totalBonusNivel: apuracao.total_bonus_nivel,
      },
      {
        adesoes: apuracao.detalhe?.adesoes ?? [],
        recorrencias: apuracao.detalhe?.recorrencias ?? [],
        descontosRastreador: apuracao.detalhe?.descontosRastreador ?? [],
        placasAtivadas: apuracao.detalhe?.placasAtivadas ?? [],
        inadimplentes: [],
        totalRecorrenciaEstimadaInadimplentes: 0,
      },
      { incluirInadimplentes: false }
    )
    anexo = { conteudo: pdf, nomeArquivo: `relatorio-consultor-${codConsultor}-${apuracao.ano}-${apuracao.mes}.pdf` }
  } catch (e) {
    console.error('Falha ao gerar PDF pra anexar ao título do Omie:', e)
  }

  try {
    await enviarContaPagar({
      apuracaoId,
      codConsultor,
      codigoClienteOmie: vinculo.codigo_cliente_omie,
      valor,
      dataVencimento: dataVencimentoBr,
      dataEmissao: calcularUltimoDiaMesBr(apuracao.ano, apuracao.mes),
      codigoCategoria: config.codigo_categoria,
      idContaCorrente: config.codigo_conta_corrente,
      criadoPor: auth.userId,
      anexo,
      chavePix: vinculo.chave_pix,
    })
    revalidatePath('/gestor/omie')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido ao enviar para o Omie.' }
  }
}

// Estorna (exclui) o título já criado no Omie pra esta apuração — pedido do cliente (15/08/2026),
// pra corrigir um envio feito com o vínculo de fornecedor errado sem precisar do suporte da
// Omie. Depois do estorno, o botão "Enviar" volta a ficar disponível pra reenviar (ver
// estornarContaPagar em lib/omie/contas-pagar.ts).
export async function estornarContaPagarAction(apuracaoId: string): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  try {
    await estornarContaPagar(apuracaoId)
    revalidatePath('/gestor/omie')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido ao estornar no Omie.' }
  }
}

// Salva/edita a chave PIX do consultor (exige vínculo já confirmado — ver salvarChavePix em
// lib/omie/vinculo.ts). Reaproveitada em todo envio futuro, sem pedir de novo todo mês.
export async function salvarChavePixAction(
  codConsultor: number,
  chavePix: string
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  const chaveLimpa = chavePix.trim()
  if (!chaveLimpa) {
    return { ok: false, erro: 'Informe a chave PIX.' }
  }

  try {
    await salvarChavePix(codConsultor, chaveLimpa)
    revalidatePath('/gestor/omie')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido.' }
  }
}

// Só pra popular o filtro de consultor/nome na tela, reaproveitando o cache de 60s que já existe
// em listarTodosConsultores (mesma fonte usada em /gestor/consultores).
export async function listarConsultoresAtivosAction() {
  const consultores = await listarTodosConsultores()
  return consultores.filter((c) => c.situacao === 'Ativo')
}
