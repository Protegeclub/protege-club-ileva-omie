import { listarTodosConsultores } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AdesaoItem, PlacaAtivadaItem, RecorrenciaItem } from '@/lib/apuracao/mensal'
import type { Consultor } from '@/types/domain'

interface ApuracaoRow {
  cod_consultor: number
  ano: number
  mes: number
  detalhe: { adesoes?: AdesaoItem[]; recorrencias?: RecorrenciaItem[]; placasAtivadas?: PlacaAtivadaItem[] } | null
}

export interface LinhaRelatorio {
  cod_consultor: number
  nomeConsultor: string
  equipe: string
  totalAdesao: number
  totalRecorrencia: number
  totalLiquido: number
  itensSemDataConhecida: number
}

export interface MesConsiderado {
  ano: number
  mes: number
  consultoresAtivosSemApuracao: number
}

// PlacaAtivadaItem já tem `consultorNome`, mas não `equipe` — anotamos aqui na coleta, já que
// `montarRelatorioConsolidado` já tem `equipePorConsultor` em escopo no mesmo loop que lê
// `.adesoes`/`.recorrencias`.
export interface PlacaAtivadaComEquipe extends PlacaAtivadaItem {
  equipe: string
}

export interface RelatorioConsolidado {
  dataInicio: string
  dataFim: string
  equipeFiltro: string | null
  linhas: LinhaRelatorio[]
  totalAdesaoGeral: number
  totalRecorrenciaGeral: number
  totalLiquidoGeral: number
  mesesConsiderados: MesConsiderado[]
  placasAtivadas: PlacaAtivadaComEquipe[]
}

// A apuração é gerada e guardada por mês inteiro (ver lib/apuracao/mensal.ts) — o relatório por
// intervalo de datas não recalcula nada na hora, só relê e filtra o que já foi apurado. Por
// isso: (1) um mês que nunca foi gerado no painel Gestor simplesmente não aparece aqui, e
// (2) o intervalo só é preciso dentro de meses já apurados.
function mesesNoIntervalo(dataInicio: string, dataFim: string): { ano: number; mes: number }[] {
  const inicio = new Date(`${dataInicio}T00:00:00`)
  const fim = new Date(`${dataFim}T00:00:00`)
  const meses: { ano: number; mes: number }[] = []
  let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  while (cursor <= fim) {
    meses.push({ ano: cursor.getFullYear(), mes: cursor.getMonth() + 1 })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return meses
}

function dataDentroDoIntervalo(data: string | null | undefined, inicio: string, fim: string) {
  if (!data) return false
  return data >= inicio && data <= fim
}

export async function montarRelatorioConsolidado(
  dataInicio: string,
  dataFim: string,
  equipeFiltro?: string
): Promise<RelatorioConsolidado> {
  const meses = mesesNoIntervalo(dataInicio, dataFim)
  if (meses.length === 0) {
    throw new Error('Data final precisa ser igual ou depois da data inicial.')
  }

  const admin = createSupabaseAdminClient()

  const [consultores, resultadosPorMes] = await Promise.all([
    listarTodosConsultores(),
    Promise.all(
      meses.map(({ ano, mes }) =>
        admin
          .from('apuracoes_mensais')
          .select('cod_consultor, ano, mes, detalhe')
          .eq('ano', ano)
          .eq('mes', mes)
      )
    ),
  ])

  const apuracoes = resultadosPorMes.flatMap((r) => (r.data ?? []) as ApuracaoRow[])
  const nomesPorConsultor = new Map<number, string>(
    consultores.map((c: Consultor) => [c.cod_consultor, c.nome])
  )
  const equipePorConsultor = new Map<number, string>(
    consultores.map((c: Consultor) => [c.cod_consultor, c.equipe || '—'])
  )

  const totaisPorConsultor = new Map<number, LinhaRelatorio>()
  const placasAtivadas: PlacaAtivadaComEquipe[] = []

  for (const row of apuracoes) {
    const adesoes = row.detalhe?.adesoes ?? []
    const recorrencias = row.detalhe?.recorrencias ?? []
    const placas = row.detalhe?.placasAtivadas ?? []

    const adesoesNoIntervalo = adesoes.filter((a) =>
      dataDentroDoIntervalo(a.dt_pagamento, dataInicio, dataFim)
    )
    const recorrenciasNoIntervalo = recorrencias.filter((r) =>
      dataDentroDoIntervalo(r.dt_pagamento, dataInicio, dataFim)
    )
    const itensSemDataConhecida = recorrencias.filter((r) => !r.dt_pagamento).length
    const equipeConsultor = equipePorConsultor.get(row.cod_consultor) ?? '—'

    // Placas ativadas coletadas fora do "continue" abaixo — um consultor pode ter tido só uma
    // placa ativada no intervalo (sem adesão/recorrência nenhuma no mesmo período) e ainda assim
    // precisa aparecer na seção de placas do PDF.
    placasAtivadas.push(
      ...placas
        .filter((p) => dataDentroDoIntervalo(p.dt_contrato, dataInicio, dataFim))
        .map((p) => ({ ...p, equipe: equipeConsultor }))
    )

    if (!adesoesNoIntervalo.length && !recorrenciasNoIntervalo.length && !itensSemDataConhecida) {
      continue
    }

    const totalAdesao = adesoesNoIntervalo.reduce((soma, item) => soma + item.valor, 0)
    const totalRecorrencia = recorrenciasNoIntervalo.reduce((soma, item) => soma + item.valor, 0)

    const acumulado: LinhaRelatorio = totaisPorConsultor.get(row.cod_consultor) ?? {
      cod_consultor: row.cod_consultor,
      nomeConsultor: nomesPorConsultor.get(row.cod_consultor) ?? `Consultor #${row.cod_consultor}`,
      equipe: equipeConsultor,
      totalAdesao: 0,
      totalRecorrencia: 0,
      totalLiquido: 0,
      itensSemDataConhecida: 0,
    }
    acumulado.totalAdesao += totalAdesao
    acumulado.totalRecorrencia += totalRecorrencia
    acumulado.totalLiquido += totalAdesao + totalRecorrencia
    acumulado.itensSemDataConhecida += itensSemDataConhecida
    totaisPorConsultor.set(row.cod_consultor, acumulado)
  }

  const equipeFiltroLimpa = (equipeFiltro ?? '').trim()
  const linhas = Array.from(totaisPorConsultor.values())
    .filter((l) => !equipeFiltroLimpa || l.equipe === equipeFiltroLimpa)
    .sort((a, b) => b.totalLiquido - a.totalLiquido)
  const placasAtivadasFiltradas = placasAtivadas
    .filter((p) => !equipeFiltroLimpa || p.equipe === equipeFiltroLimpa)
    .sort((a, b) => a.dt_contrato.localeCompare(b.dt_contrato))

  const codConsultoresAtivos = new Set(
    consultores.filter((c) => c.situacao === 'Ativo').map((c) => c.cod_consultor)
  )

  const mesesConsiderados: MesConsiderado[] = meses.map(({ ano, mes }) => {
    const geradosNesseMes = new Set(
      apuracoes.filter((r) => r.ano === ano && r.mes === mes).map((r) => r.cod_consultor)
    )
    const consultoresAtivosSemApuracao = [...codConsultoresAtivos].filter(
      (cod) => !geradosNesseMes.has(cod)
    ).length
    return { ano, mes, consultoresAtivosSemApuracao }
  })

  return {
    dataInicio,
    dataFim,
    equipeFiltro: equipeFiltroLimpa || null,
    linhas,
    totalAdesaoGeral: linhas.reduce((soma, l) => soma + l.totalAdesao, 0),
    totalRecorrenciaGeral: linhas.reduce((soma, l) => soma + l.totalRecorrencia, 0),
    totalLiquidoGeral: linhas.reduce((soma, l) => soma + l.totalLiquido, 0),
    mesesConsiderados,
    placasAtivadas: placasAtivadasFiltradas,
  }
}
