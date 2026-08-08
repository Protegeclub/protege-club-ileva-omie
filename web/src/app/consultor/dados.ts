import { buscarConsultor } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  montarEvolucao,
  periodoAnterior,
  type ApuracaoRow,
  type LinhaEvolucaoRow,
  type PontoEvolucaoConsultor,
} from './tipos'

const MESES_EVOLUCAO = 6
const SELECT_EVOLUCAO = 'mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_bonus_nivel, total_premiacao_individual, total_comissao_gerencial, total_liquido, detalhe'

export interface ContextoConsultor {
  codConsultor: number
  nomeConsultor: string
  equipeNome: string
  ano: number
  mes: number
  equipeAtiva: boolean
  linhaPropria: ApuracaoRow | null
  // Quando `equipeAtiva`, inclui a linha própria + a dos colegas de equipe que já tiveram
  // apuração gerada no mesmo período (quem não gerou ainda simplesmente não entra na soma —
  // mesma limitação de "apuração é sob demanda" do resto do sistema).
  linhasEquipe: ApuracaoRow[]
  // Mesmo mês do ano anterior — só pra comparação dos KPIs (ver calcularTendencia).
  anterior: ApuracaoRow | null
  // Últimos MESES_EVOLUCAO períodos (mês atual incluso) — alimenta os gráficos e as sparklines.
  evolucao: PontoEvolucaoConsultor[]
}

export type ResultadoContexto = ContextoConsultor | { erro: string }

export async function carregarContextoConsultor(searchParams: {
  ano?: string
  mes?: string
  equipe?: string
}): Promise<ResultadoContexto> {
  const hoje = new Date()
  const ano = Number(searchParams.ano) || hoje.getFullYear()
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1
  const equipeAtiva = searchParams.equipe === '1'

  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('cod_consultor, nome')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfil?.cod_consultor) {
    return { erro: 'Este usuário não está vinculado a um consultor do Ileva (fale com o Gestor).' }
  }

  const SELECT_APURACAO =
    'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_bonus_nivel, total_liquido, cod_equipe, gerado_em, detalhe'

  const periodoAnt = periodoAnterior(ano, mes)
  const periodos: { ano: number; mes: number }[] = []
  let cursor = { ano, mes }
  for (let i = 0; i < MESES_EVOLUCAO; i++) {
    periodos.unshift(cursor)
    cursor = periodoAnterior(cursor.ano, cursor.mes)
  }

  const [{ data: linhaPropria }, { data: linhaAnterior }, evolucaoResultados] = await Promise.all([
    supabase
      .from('apuracoes_mensais')
      .select(SELECT_APURACAO)
      .eq('cod_consultor', perfil.cod_consultor)
      .eq('ano', ano)
      .eq('mes', mes)
      .maybeSingle<ApuracaoRow>(),
    supabase
      .from('apuracoes_mensais')
      .select(SELECT_APURACAO)
      .eq('cod_consultor', perfil.cod_consultor)
      .eq('ano', periodoAnt.ano)
      .eq('mes', periodoAnt.mes)
      .maybeSingle<ApuracaoRow>(),
    Promise.all(
      periodos.map(({ ano: a, mes: m }) =>
        supabase
          .from('apuracoes_mensais')
          .select(SELECT_EVOLUCAO)
          .eq('cod_consultor', perfil.cod_consultor)
          .eq('ano', a)
          .eq('mes', m)
          .maybeSingle<LinhaEvolucaoRow>()
      )
    ),
  ])

  let linhasEquipe: ApuracaoRow[] = linhaPropria ? [linhaPropria] : []
  let equipeNome = ''

  try {
    const { consultor } = await buscarConsultor({ cod_consultor: perfil.cod_consultor })
    equipeNome = consultor.equipe || ''

    if (equipeAtiva) {
      const admin = createSupabaseAdminClient()
      const { data } = await admin
        .from('apuracoes_mensais')
        .select(SELECT_APURACAO)
        .eq('cod_equipe', consultor.cod_equipe)
        .eq('ano', ano)
        .eq('mes', mes)
      linhasEquipe = (data ?? []) as ApuracaoRow[]
    }
  } catch {
    // Se o Ileva falhar aqui, degrada mostrando só os dados próprios em vez de quebrar a tela.
    linhasEquipe = linhaPropria ? [linhaPropria] : []
  }

  return {
    codConsultor: perfil.cod_consultor,
    nomeConsultor: perfil.nome,
    equipeNome,
    ano,
    mes,
    equipeAtiva,
    linhaPropria: linhaPropria ?? null,
    linhasEquipe,
    anterior: linhaAnterior ?? null,
    evolucao: montarEvolucao(
      periodos,
      evolucaoResultados.map((r) => r.data ?? null)
    ),
  }
}
