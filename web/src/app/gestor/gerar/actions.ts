'use server'

import { tasks } from '@trigger.dev/sdk/v3'
import { revalidatePath } from 'next/cache'
import type { GerarApuracaoPayload, gerarApuracaoTask } from '@/trigger/gerar-apuracao'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Autorizacao = { userId: string } | { erro: string }

async function autorizarGestor(): Promise<Autorizacao> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  // Defesa em profundidade: reconfirma o perfil aqui, não confia só no proxy.ts (ver nota em
  // src/proxy.ts sobre o próprio Next.js avisar que isso pode ser contornado).
  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    return { erro: 'Sem permissão para gerar apuração.' }
  }

  return { userId: userData.user.id }
}

export interface StatusJob {
  cod_consultor: number
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  erro_mensagem: string | null
  atualizado_em: string
}

// Cria (ou reinicia) o acompanhamento de status e dispara a geração em segundo plano no
// Trigger.dev — não espera o resultado aqui (ver web/src/trigger/gerar-apuracao.ts: alguns
// consultores levam até 31min pra gerar, inviável dentro de uma Server Action síncrona na
// Vercel). O client acompanha o progresso consultando `consultarStatusPeriodo`.
export async function solicitarApuracao(
  codConsultor: number,
  ano: number,
  mes: number
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  if (!codConsultor || !ano || !mes) {
    return { ok: false, erro: 'Informe consultor, ano e mês.' }
  }

  const admin = createSupabaseAdminClient()

  const { error: erroUpsert } = await admin.from('apuracao_jobs').upsert(
    {
      cod_consultor: codConsultor,
      ano,
      mes,
      status: 'pendente',
      erro_mensagem: null,
      solicitado_por: auth.userId,
      solicitado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'cod_consultor,ano,mes' }
  )

  if (erroUpsert) {
    return { ok: false, erro: `Erro ao registrar o pedido: ${erroUpsert.message}` }
  }

  try {
    const payload: GerarApuracaoPayload = {
      codConsultor,
      ano,
      mes,
      geradoPorUserId: auth.userId,
    }
    const handle = await tasks.trigger<typeof gerarApuracaoTask>('gerar-apuracao', payload)

    await admin
      .from('apuracao_jobs')
      .update({ trigger_run_id: handle.id })
      .eq('cod_consultor', codConsultor)
      .eq('ano', ano)
      .eq('mes', mes)

    return { ok: true }
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido ao disparar a tarefa.'
    await admin
      .from('apuracao_jobs')
      .update({ status: 'erro', erro_mensagem: mensagem })
      .eq('cod_consultor', codConsultor)
      .eq('ano', ano)
      .eq('mes', mes)
    return { ok: false, erro: mensagem }
  }
}

// Dispara todos os consultores de uma vez — o laço inteiro roda AQUI, dentro da Server Action,
// não mais no client. Achado real ao testar: o disparo um-a-um feito pelo navegador (fila
// client-side) dependia da aba ficar aberta até TERMINAR de enfileirar todo mundo (~205 chamadas,
// cada uma com idas e voltas de rede) — fechar a aba no meio do disparo deixava quem ainda não
// tinha sido enfileirado sem rodar nunca, contradizendo a promessa de "pode fechar essa aba".
// `tasks.batchTrigger` pareceria a solução óbvia (1 chamada só), mas testado e descartado: os
// runs não aparecem no worker local (`trigger.dev dev`) mesmo depois de mais de 1 minuto — não
// confiável o bastante pra validar antes de ir pra produção. Em vez disso, dispara um por um
// (mesmo `tasks.trigger` já comprovado funcionando) com concorrência limitada, tudo dentro de uma
// única execução no servidor — imune a fechar a aba, e rápido o bastante (poucos segundos pra
// ~200 consultores) pra nunca chegar perto do timeout de função da Vercel.
export async function solicitarApuracaoLote(
  itens: { codConsultor: number }[],
  ano: number,
  mes: number
): Promise<{ ok: boolean; erro?: string }> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }
  const { userId } = auth

  if (itens.length === 0 || !ano || !mes) {
    return { ok: false, erro: 'Informe ao menos um consultor, ano e mês.' }
  }

  const admin = createSupabaseAdminClient()
  const agora = new Date().toISOString()

  const { error: erroUpsert } = await admin.from('apuracao_jobs').upsert(
    itens.map((item) => ({
      cod_consultor: item.codConsultor,
      ano,
      mes,
      status: 'pendente' as const,
      erro_mensagem: null,
      solicitado_por: userId,
      solicitado_em: agora,
      atualizado_em: agora,
    })),
    { onConflict: 'cod_consultor,ano,mes' }
  )

  if (erroUpsert) {
    return { ok: false, erro: `Erro ao registrar os pedidos: ${erroUpsert.message}` }
  }

  // Concorrência baixa de propósito: testado com 15 e a API de trigger do Trigger.dev devolveu
  // erro (provável rate limit) pra ~1/3 dos disparos. Com retentativa + espera crescente, poucos
  // disparos concorrentes é mais confiável do que muitos disparando tudo de uma vez.
  const CONCORRENCIA_DISPARO = 4
  const fila = [...itens]
  const falhas: { cod: number; mensagem: string }[] = []

  async function dispararComRetentativa(item: { codConsultor: number }, tentativa = 1): Promise<void> {
    const payload: GerarApuracaoPayload = {
      codConsultor: item.codConsultor,
      ano,
      mes,
      geradoPorUserId: userId,
    }
    try {
      await tasks.trigger<typeof gerarApuracaoTask>('gerar-apuracao', payload)
    } catch (e) {
      if (tentativa < 3) {
        await new Promise((r) => setTimeout(r, 400 * tentativa))
        return dispararComRetentativa(item, tentativa + 1)
      }
      falhas.push({ cod: item.codConsultor, mensagem: e instanceof Error ? e.message : String(e) })
    }
  }

  async function dispararProximo(): Promise<void> {
    const item = fila.shift()
    if (!item) return
    await dispararComRetentativa(item)
    await dispararProximo()
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCORRENCIA_DISPARO, itens.length) }, () => dispararProximo())
  )

  for (const falha of falhas) {
    await admin
      .from('apuracao_jobs')
      .update({ status: 'erro', erro_mensagem: falha.mensagem })
      .eq('ano', ano)
      .eq('mes', mes)
      .eq('cod_consultor', falha.cod)
  }

  return { ok: true }
}

// Consultada em loop pelo client (GerarApuracaoForm e GerarLoteForm) pra saber o andamento sem
// precisar esperar uma chamada só terminar.
export async function consultarStatusPeriodo(ano: number, mes: number): Promise<StatusJob[]> {
  const auth = await autorizarGestor()
  if ('erro' in auth) return []

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('apuracao_jobs')
    .select('cod_consultor, status, erro_mensagem, atualizado_em')
    .eq('ano', ano)
    .eq('mes', mes)

  return (data ?? []) as StatusJob[]
}

export interface StatusCompetencia {
  totalAtivos: number
  processados: number
  pendentes: number
  processando: number
  erros: number
  situacao: 'apurado' | 'pendente' | 'parcial' | 'erro' | 'incompleto'
  ultimaExecucao: string | null
  executadoPor: string | null
}

// Resumo server-side da competência (mês/ano) pro card de status principal e a barra "Status
// geral" — chamado uma vez no carregamento da página (SSR), pra já mostrar a situação certa sem
// esperar o polling client-side (mesmos dados que consultarStatusPeriodo, só que também cruzados
// com apuracoes_mensais pra saber quem gerou).
//
// De propósito NÃO calcula "tempo médio/total de execução" a partir de apuracao_jobs: testado e
// descartado — `solicitado_em` é carimbado no ENFILEIRAMENTO, não no início do processamento de
// verdade, e com concurrencyLimit=1 (ver trigger/gerar-apuracao.ts) um consultor no fim da fila
// de ~200 espera bastante antes de começar a rodar. `atualizado_em - solicitado_em` mede fila +
// processamento juntos, não só o processamento — deu valores de "73min"/"115min" por consultor
// em testes reais, quando o processamento de verdade leva segundos. Medir só o processamento
// exigiria um novo carimbo de "início real" gravado pelo próprio trigger, o que alteraria o
// processamento em segundo plano (fora do escopo deste ajuste, só visual).
export async function buscarStatusCompetencia(
  ano: number,
  mes: number,
  codsAtivos: number[]
): Promise<StatusCompetencia> {
  const admin = createSupabaseAdminClient()
  const codsSet = new Set(codsAtivos)

  const [{ data: jobsData }, { data: apuracoesData }] = await Promise.all([
    admin
      .from('apuracao_jobs')
      .select('cod_consultor, status, solicitado_em, atualizado_em')
      .eq('ano', ano)
      .eq('mes', mes),
    admin.from('apuracoes_mensais').select('gerado_em, gerado_por').eq('ano', ano).eq('mes', mes),
  ])

  const jobs = (jobsData ?? []).filter((j) => codsSet.has(j.cod_consultor))

  const processados = jobs.filter((j) => j.status === 'concluido').length
  const erros = jobs.filter((j) => j.status === 'erro').length
  const processando = jobs.filter((j) => j.status === 'processando').length
  const pendentes = jobs.filter((j) => j.status === 'pendente').length
  const totalAtivos = codsAtivos.length

  // "parcial" (em andamento de verdade) exige algo pendente ou rodando agora. Sem isso, um mero
  // gap entre processados e totalAtivos (ex.: 5 consultores ficaram ativos no Ileva depois do
  // lote ter sido disparado, e nunca tiveram job criado — não é "pendente", nem "erro", é
  // simplesmente ausente de apuracao_jobs) caía direto no "parcial"/"em andamento" mesmo com
  // pendentes=0 e processando=0, dando a entender que algo ainda estava rodando quando não
  // estava (achado real, 29/08/2026: 190 de 195 processados, 0 pendentes/erros, mostrando
  // "Apuração em andamento" indefinidamente). Esse gap agora vira "incompleto" — mensagem própria
  // que deixa claro que nada está rodando e que é preciso gerar de novo pra completar.
  let situacao: StatusCompetencia['situacao']
  if (erros > 0) situacao = 'erro'
  else if (processados >= totalAtivos && totalAtivos > 0) situacao = 'apurado'
  else if (pendentes > 0 || processando > 0) situacao = 'parcial'
  else if (processados === 0) situacao = 'pendente'
  else situacao = 'incompleto'

  const apuracoes = apuracoesData ?? []
  const ultimaApuracao = apuracoes.reduce<{ gerado_em: string; gerado_por: string } | null>(
    (max, a) => (!max || a.gerado_em > max.gerado_em ? a : max),
    null
  )

  let executadoPor: string | null = null
  if (ultimaApuracao?.gerado_por) {
    const { data: perfil } = await admin
      .from('perfis')
      .select('nome')
      .eq('user_id', ultimaApuracao.gerado_por)
      .maybeSingle()
    executadoPor = perfil?.nome ?? null
  }

  return {
    totalAtivos,
    processados,
    pendentes,
    processando,
    erros,
    situacao,
    ultimaExecucao: ultimaApuracao?.gerado_em ?? null,
    executadoPor,
  }
}

// Chamada pelo client quando encerra de acompanhar um lote (todo mundo concluído/erro, ou
// cancelado) — as páginas /consultor e /gestor já renderizam dinamicamente (dependem de cookie
// de sessão/searchParams), então isso é mais reforço do que estritamente necessário.
export async function revalidarPaineisAposLote() {
  revalidatePath('/consultor')
  revalidatePath('/gestor')
  revalidatePath('/gestor/consultores')
}
