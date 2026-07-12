'use server'

import { revalidatePath } from 'next/cache'
import { gerarESalvarApuracao } from '@/lib/apuracao/gerar'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface GerarApuracaoEstado {
  sucesso?: boolean
  erro?: string
  resumo?: { totalAdesao: number; totalRecorrencia: number }
}

type Autorizacao = { userId: string } | { erro: string }

async function autorizarComercialOuGestor(): Promise<Autorizacao> {
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

  if (!perfilRow || (perfilRow.perfil !== 'gestor' && perfilRow.perfil !== 'comercial')) {
    return { erro: 'Sem permissão para gerar apuração.' }
  }

  return { userId: userData.user.id }
}

export async function gerarApuracao(
  _estadoAnterior: GerarApuracaoEstado,
  formData: FormData
): Promise<GerarApuracaoEstado> {
  const auth = await autorizarComercialOuGestor()
  if ('erro' in auth) return { erro: auth.erro }

  const codConsultor = Number(formData.get('cod_consultor'))
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))

  if (!codConsultor || !ano || !mes) {
    return { erro: 'Preencha consultor, ano e mês.' }
  }

  try {
    const resultado = await gerarESalvarApuracao(auth.userId, codConsultor, ano, mes)
    revalidatePath('/consultor')
    revalidatePath('/gestor')

    return {
      sucesso: true,
      resumo: { totalAdesao: resultado.totalAdesao, totalRecorrencia: resultado.totalRecorrencia },
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Erro desconhecido ao gerar apuração.' }
  }
}

export interface ResultadoGeracaoLote {
  ok: boolean
  nomeConsultor?: string
  totalLiquido?: number
  erro?: string
}

// Chamada diretamente (não como form action) pelo GerarLoteForm no client, um consultor por
// chamada — de propósito, em vez de uma Server Action só rodando os ~206 consultores ativos numa
// invocação síncrona. Nunca testamos o tempo dos consultores grandes (um caso real chegou a 871
// veículos, ver CONTEXTO_E_CHECKLIST.md 6.4) e uma função serverless tem timeout; rodando um de
// cada vez, o client controla a fila/concorrência e um consultor lento não derruba o lote inteiro
// — só aquela linha fica marcada como erro/timeout, o resto continua.
export async function gerarApuracaoUmConsultor(
  codConsultor: number,
  ano: number,
  mes: number
): Promise<ResultadoGeracaoLote> {
  const auth = await autorizarComercialOuGestor()
  if ('erro' in auth) return { ok: false, erro: auth.erro }

  try {
    const resultado = await gerarESalvarApuracao(auth.userId, codConsultor, ano, mes)
    return { ok: true, nomeConsultor: resultado.nomeConsultor, totalLiquido: resultado.totalLiquido }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro desconhecido.' }
  }
}

// Chamada uma vez pelo client ao final do lote — as páginas /consultor e /gestor já renderizam
// dinamicamente (dependem de cookie de sessão/searchParams), então isso é mais reforço do que
// estritamente necessário, mas evita qualquer dúvida sobre cache stale depois de um lote grande.
export async function revalidarPaineisAposLote() {
  revalidatePath('/consultor')
  revalidatePath('/gestor')
}
