import { buscarConsultor } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ApuracaoRow } from './tipos'

export interface ContextoConsultor {
  codConsultor: number
  nomeConsultor: string
  ano: number
  mes: number
  equipeAtiva: boolean
  linhaPropria: ApuracaoRow | null
  // Quando `equipeAtiva`, inclui a linha própria + a dos colegas de equipe que já tiveram
  // apuração gerada no mesmo período (quem não gerou ainda simplesmente não entra na soma —
  // mesma limitação de "apuração é sob demanda" do resto do sistema).
  linhasEquipe: ApuracaoRow[]
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

  const { data: linhaPropria } = await supabase
    .from('apuracoes_mensais')
    .select(
      'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_liquido, cod_equipe, gerado_em, detalhe'
    )
    .eq('cod_consultor', perfil.cod_consultor)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle<ApuracaoRow>()

  let linhasEquipe: ApuracaoRow[] = linhaPropria ? [linhaPropria] : []

  if (equipeAtiva) {
    try {
      const { consultor } = await buscarConsultor({ cod_consultor: perfil.cod_consultor })
      const admin = createSupabaseAdminClient()
      const { data } = await admin
        .from('apuracoes_mensais')
        .select(
          'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_liquido, cod_equipe, gerado_em, detalhe'
        )
        .eq('cod_equipe', consultor.cod_equipe)
        .eq('ano', ano)
        .eq('mes', mes)
      linhasEquipe = (data ?? []) as ApuracaoRow[]
    } catch {
      // Se o Ileva falhar aqui, degrada mostrando só os dados próprios em vez de quebrar a tela.
      linhasEquipe = linhaPropria ? [linhaPropria] : []
    }
  }

  return {
    codConsultor: perfil.cod_consultor,
    nomeConsultor: perfil.nome,
    ano,
    mes,
    equipeAtiva,
    linhaPropria: linhaPropria ?? null,
    linhasEquipe,
  }
}
