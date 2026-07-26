import type { ApuracaoDetalhe } from '@/app/consultor/tipos'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Consultor } from '@/types/domain'

interface ApuracaoRowDashboard {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  detalhe: ApuracaoDetalhe | null
  gerado_em: string
}

interface JobRowDashboard {
  cod_consultor: number
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
}

export interface StatusContagem {
  gerado: number
  pendente: number
  processando: number
  erro: number
}

export interface RankingConsultorItem {
  cod_consultor: number
  nomeConsultor: string
  equipe: string
  qtdAdesoes: number
}

export interface RankingEquipeItem {
  equipe: string
  qtdAdesoes: number
  qtdConsultores: number
}

export interface PontoEvolucao {
  ano: number
  mes: number
  rotulo: string
  totalLiquido: number
  totalAdesao: number
  totalRecorrencia: number
}

// Mesmos totais do mês, mas do período anterior — só pra calcular a tendência dos cards de KPI
// (ver calcularTendencia em TabelaGestor.tsx/CardKpi), mesmo padrão que consultores/page.tsx já
// usa hoje.
export interface TotaisPeriodo {
  totalLiquido: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  qtdPlacasAtivadas: number
}

export interface DashboardMes {
  ano: number
  mes: number
  totalLiquido: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  qtdPlacasAtivadas: number
  qtdConsultoresApurados: number
  qtdConsultoresAtivos: number
  ultimaAtualizacao: string | null
  anterior: TotaisPeriodo
  statusContagem: StatusContagem
  rankingConsultores: RankingConsultorItem[]
  rankingEquipes: RankingEquipeItem[]
  evolucao: PontoEvolucao[]
}

const NOMES_MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const TOP_N = 10
const MESES_EVOLUCAO = 6

function periodoAnterior(ano: number, mes: number) {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}

// Só lê e agrega o que já está calculado e salvo em apuracoes_mensais/apuracao_jobs (ver
// lib/apuracao/mensal.ts, gerar.ts e gestor/gerar/actions.ts) — soma, conta e agrupa, sem
// recalcular nada nem chamar o Ileva pra dado financeiro. Mesmo padrão de join (Ileva cacheado +
// Supabase admin) já usado em gestor/consultores/page.tsx.
export async function montarDashboardMes(ano: number, mes: number): Promise<DashboardMes> {
  const admin = createSupabaseAdminClient()

  // Últimos MESES_EVOLUCAO períodos (mês atual incluso, do mais antigo pro mais recente) — só
  // pra alimentar o gráfico de linha, com um select bem enxuto (2 colunas, sem `detalhe`) pra
  // manter isso leve mesmo somando 6 meses de consultores ativos.
  const periodos: { ano: number; mes: number }[] = []
  let cursor = { ano, mes }
  for (let i = 0; i < MESES_EVOLUCAO; i++) {
    periodos.unshift(cursor)
    cursor = periodoAnterior(cursor.ano, cursor.mes)
  }

  const periodoAnteriorAlvo = periodoAnterior(ano, mes)

  const [consultores, apuracoesResult, jobsResult, evolucaoResultados, apuracoesAnteriorResult] = await Promise.all([
    listarTodosConsultores(),
    admin
      .from('apuracoes_mensais')
      .select('cod_consultor, total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, detalhe, gerado_em')
      .eq('ano', ano)
      .eq('mes', mes),
    admin.from('apuracao_jobs').select('cod_consultor, status').eq('ano', ano).eq('mes', mes),
    Promise.all(
      periodos.map(({ ano: a, mes: m }) =>
        admin
          .from('apuracoes_mensais')
          .select('total_liquido, total_adesao, total_recorrencia')
          .eq('ano', a)
          .eq('mes', m)
      )
    ),
    admin
      .from('apuracoes_mensais')
      .select('total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, detalhe')
      .eq('ano', periodoAnteriorAlvo.ano)
      .eq('mes', periodoAnteriorAlvo.mes),
  ])

  const consultoresAtivos = consultores.filter((c: Consultor) => c.situacao === 'Ativo')
  const codsAtivos = new Set(consultoresAtivos.map((c) => c.cod_consultor))
  const equipePorConsultor = new Map<number, string>(
    consultores.map((c: Consultor) => [c.cod_consultor, c.equipe || '—'])
  )
  const nomePorConsultor = new Map<number, string>(consultores.map((c: Consultor) => [c.cod_consultor, c.nome]))

  const linhas = ((apuracoesResult.data ?? []) as ApuracaoRowDashboard[]).filter((l) =>
    codsAtivos.has(l.cod_consultor)
  )

  let totalLiquido = 0
  let totalAdesao = 0
  let totalRecorrencia = 0
  let totalDescontoRastreador = 0
  let qtdPlacasAtivadas = 0
  const rankingConsultores: RankingConsultorItem[] = []
  const porEquipe = new Map<string, { qtdAdesoes: number; qtdConsultores: number }>()

  for (const linha of linhas) {
    totalLiquido += linha.total_liquido
    totalAdesao += linha.total_adesao
    totalRecorrencia += linha.total_recorrencia
    totalDescontoRastreador += linha.total_desconto_rastreador
    qtdPlacasAtivadas += linha.detalhe?.placasAtivadas?.length ?? 0

    const equipe = equipePorConsultor.get(linha.cod_consultor) ?? '—'
    const qtdAdesoes = linha.detalhe?.adesoes?.length ?? 0

    rankingConsultores.push({
      cod_consultor: linha.cod_consultor,
      nomeConsultor: nomePorConsultor.get(linha.cod_consultor) ?? `Consultor #${linha.cod_consultor}`,
      equipe,
      qtdAdesoes,
    })

    const acumuladoEquipe = porEquipe.get(equipe) ?? { qtdAdesoes: 0, qtdConsultores: 0 }
    acumuladoEquipe.qtdAdesoes += qtdAdesoes
    acumuladoEquipe.qtdConsultores += 1
    porEquipe.set(equipe, acumuladoEquipe)
  }

  // Status de cada consultor ATIVO (não só quem já tem linha em apuracoes_mensais) — pra contagem
  // completa do donut de status bater com o total de consultores, igual à coluna Status da
  // tabela de consultores (mesma regra de calcularStatus em TabelaGestor.tsx).
  const jobs = (jobsResult.data ?? []) as JobRowDashboard[]
  const jobStatusPorConsultor = new Map(jobs.map((j) => [j.cod_consultor, j.status]))
  const apuradoSet = new Set(linhas.map((l) => l.cod_consultor))

  const statusContagem: StatusContagem = { gerado: 0, pendente: 0, processando: 0, erro: 0 }
  for (const consultor of consultoresAtivos) {
    if (apuradoSet.has(consultor.cod_consultor)) {
      statusContagem.gerado += 1
      continue
    }
    const status = jobStatusPorConsultor.get(consultor.cod_consultor)
    if (status === 'processando') statusContagem.processando += 1
    else if (status === 'erro') statusContagem.erro += 1
    else statusContagem.pendente += 1
  }

  const evolucao: PontoEvolucao[] = periodos.map(({ ano: a, mes: m }, i) => {
    const linhasPeriodo = (evolucaoResultados[i].data ?? []) as {
      total_liquido: number
      total_adesao: number
      total_recorrencia: number
    }[]
    return {
      ano: a,
      mes: m,
      rotulo: `${NOMES_MESES_ABREV[m - 1]}/${String(a).slice(2)}`,
      totalLiquido: linhasPeriodo.reduce((soma, l) => soma + l.total_liquido, 0),
      totalAdesao: linhasPeriodo.reduce((soma, l) => soma + l.total_adesao, 0),
      totalRecorrencia: linhasPeriodo.reduce((soma, l) => soma + l.total_recorrencia, 0),
    }
  })

  const rankingEquipes = Array.from(porEquipe.entries())
    .map(([equipe, valores]) => ({ equipe, ...valores }))
    .sort((a, b) => b.qtdAdesoes - a.qtdAdesoes)
    .slice(0, TOP_N)

  // Maior gerado_em entre as linhas do mês — mesmo padrão de "Última atualização" já usado em
  // gestor/consultores/page.tsx.
  const ultimaAtualizacao = linhas.reduce<string | null>(
    (max, l) => (!max || l.gerado_em > max ? l.gerado_em : max),
    null
  )

  const linhasAnterior = (apuracoesAnteriorResult.data ?? []) as {
    total_adesao: number
    total_recorrencia: number
    total_desconto_rastreador: number
    total_liquido: number
    detalhe: ApuracaoDetalhe | null
  }[]
  const anterior: TotaisPeriodo = linhasAnterior.reduce(
    (acc, l) => ({
      totalLiquido: acc.totalLiquido + l.total_liquido,
      totalAdesao: acc.totalAdesao + l.total_adesao,
      totalRecorrencia: acc.totalRecorrencia + l.total_recorrencia,
      totalDescontoRastreador: acc.totalDescontoRastreador + l.total_desconto_rastreador,
      qtdPlacasAtivadas: acc.qtdPlacasAtivadas + (l.detalhe?.placasAtivadas?.length ?? 0),
    }),
    { totalLiquido: 0, totalAdesao: 0, totalRecorrencia: 0, totalDescontoRastreador: 0, qtdPlacasAtivadas: 0 }
  )

  return {
    ano,
    mes,
    totalLiquido,
    totalAdesao,
    totalRecorrencia,
    totalDescontoRastreador,
    qtdPlacasAtivadas,
    qtdConsultoresApurados: linhas.length,
    qtdConsultoresAtivos: consultoresAtivos.length,
    ultimaAtualizacao,
    anterior,
    statusContagem,
    rankingConsultores: [...rankingConsultores].sort((a, b) => b.qtdAdesoes - a.qtdAdesoes).slice(0, TOP_N),
    rankingEquipes,
    evolucao,
  }
}
