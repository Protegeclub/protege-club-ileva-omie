import { buscarConsultor } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ApuracaoRow } from '@/app/consultor/tipos'

export interface ContextoGestorConsultor {
  codConsultor: number
  nomeConsultor: string
  ano: number
  mes: number
  equipeAtiva: boolean
  linhaPropria: ApuracaoRow | null
  linhasEquipe: ApuracaoRow[]
}

export type ResultadoContextoGestor = ContextoGestorConsultor | { erro: string }

const SELECT_APURACAO =
  'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_liquido, cod_equipe, gerado_em, detalhe'

// Equivalente a web/src/app/consultor/dados.ts, mas para o Gestor olhar a apuração de
// QUALQUER consultor (não só a própria) — por isso usa direto o cliente admin (bypassa a RLS de
// apuracoes_mensais, que só deixa cada consultor ver a própria linha) em vez de resolver
// cod_consultor a partir do perfil de quem está logado. Autorização de quem pode chamar isso já
// é garantida por perfilPermiteRota (proxy.ts) + o layout de /gestor.
export async function carregarContextoGestorConsultor(
  codConsultor: number,
  searchParams: { ano?: string; mes?: string; equipe?: string }
): Promise<ResultadoContextoGestor> {
  if (!codConsultor) {
    return { erro: 'Código de consultor inválido.' }
  }

  const hoje = new Date()
  const ano = Number(searchParams.ano) || hoje.getFullYear()
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1
  const equipeAtiva = searchParams.equipe === '1'

  const admin = createSupabaseAdminClient()

  const { data: linhaPropria } = await admin
    .from('apuracoes_mensais')
    .select(SELECT_APURACAO)
    .eq('cod_consultor', codConsultor)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle<ApuracaoRow>()

  let linhasEquipe: ApuracaoRow[] = linhaPropria ? [linhaPropria] : []
  let nomeConsultor = linhaPropria?.detalhe?.nomeConsultor ?? ''
  let codEquipeConsultor = linhaPropria?.cod_equipe ?? null

  if (!nomeConsultor || (equipeAtiva && !codEquipeConsultor)) {
    try {
      const { consultor } = await buscarConsultor({ cod_consultor: codConsultor })
      nomeConsultor = nomeConsultor || consultor.nome
      codEquipeConsultor = codEquipeConsultor ?? consultor.cod_equipe
    } catch {
      nomeConsultor = nomeConsultor || `Consultor #${codConsultor}`
    }
  }

  if (equipeAtiva && codEquipeConsultor) {
    const { data } = await admin
      .from('apuracoes_mensais')
      .select(SELECT_APURACAO)
      .eq('cod_equipe', codEquipeConsultor)
      .eq('ano', ano)
      .eq('mes', mes)
    linhasEquipe = (data ?? []) as ApuracaoRow[]
  }

  return {
    codConsultor,
    nomeConsultor,
    ano,
    mes,
    equipeAtiva,
    linhaPropria: linhaPropria ?? null,
    linhasEquipe,
  }
}
