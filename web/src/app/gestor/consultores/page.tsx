import type { ApuracaoDetalhe } from '@/app/consultor/tipos'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Consultor } from '@/types/domain'
import { TabelaGestor, type ApuracaoResumo, type JobResumo } from '../TabelaGestor'

interface ApuracaoRowComDetalhe {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  gerado_em: string
  detalhe: ApuracaoDetalhe | null
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function GestorConsultoresPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string; q?: string; sort?: string; dir?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

  // Só ano/mes exigem uma nova busca no servidor (dataset diferente de apuração). Equipe, busca
  // e ordenação de coluna são aplicadas no cliente (ver TabelaGestor) — sem round-trip nenhum —
  // desde que os dados desse mês já estejam carregados aqui.
  const equipeInicial = (params.equipe ?? '').trim()
  const buscaInicial = (params.q ?? '').trim()
  const sortInicial = (params.sort ?? '').trim()
  const dirInicial: 'asc' | 'desc' = params.dir === 'asc' ? 'asc' : 'desc'

  // Mês anterior (com virada de ano em janeiro) — só pra calcular a tendência dos KPIs
  // ("↑ 14% em relação ao mês passado"). É uma leitura a mais dos mesmos totais já gravados em
  // apuracoes_mensais, não um cálculo novo — não mexe em nenhuma fórmula de apuração.
  const mesAnterior = mes === 1 ? 12 : mes - 1
  const anoAnterior = mes === 1 ? ano - 1 : ano

  // Visão consolidada: cruza o cadastro de consultores do Ileva (~245 hoje, cacheado por 60s —
  // ver listarTodosConsultores — pra não repetir a chamada externa a cada navegação) com o que
  // já foi gerado no Supabase para o mês selecionado. Usa o cliente admin porque a RLS de
  // apuracoes_mensais só deixa cada consultor ver a própria linha — o Gestor precisa ver todas.
  const [consultores, apuracoesResult, apuracoesAnteriorResult, jobsResult] = await Promise.all([
    listarTodosConsultores(),
    createSupabaseAdminClient()
      .from('apuracoes_mensais')
      .select('cod_consultor, total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, gerado_em, detalhe')
      .eq('ano', ano)
      .eq('mes', mes),
    createSupabaseAdminClient()
      .from('apuracoes_mensais')
      .select('cod_consultor, total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, gerado_em, detalhe')
      .eq('ano', anoAnterior)
      .eq('mes', mesAnterior),
    // Status de geração em segundo plano (mesma tabela que /gestor/gerar usa pra acompanhar o
    // Trigger.dev) — só pra exibir o badge de Pendente/Processando/Erro; não influencia nenhum
    // total calculado.
    createSupabaseAdminClient()
      .from('apuracao_jobs')
      .select('cod_consultor, status, erro_mensagem')
      .eq('ano', ano)
      .eq('mes', mes),
  ])

  // Vem com `detalhe` (JSONB) só pra extrair a quantidade de placas ativadas — não repassamos o
  // objeto inteiro pro client (TabelaGestor), pra não mandar adesões/recorrências/inadimplentes de
  // ~200 consultores num prop à toa.
  const apuracoesComDetalhe = (apuracoesResult.data ?? []) as ApuracaoRowComDetalhe[]
  const apuracoes: ApuracaoResumo[] = apuracoesComDetalhe.map(({ detalhe, ...resto }) => ({
    ...resto,
    qtd_placas_ativadas: detalhe?.placasAtivadas?.length ?? 0,
  }))
  const apuracaoPorConsultor = new Map(apuracoes.map((a) => [a.cod_consultor, a]))

  // Mesmo tratamento do mês atual (linha 78) — só extrai a contagem de placas do `detalhe` do
  // mês anterior, pra alimentar o sparkline "Placas ativadas" do KPI (mesmo padrão do Dashboard,
  // pedido do Samuel em 02/08/2026). Não é recalculado: o número já está gravado desde a
  // apuração daquele mês.
  const apuracoesAnteriorComDetalhe = (apuracoesAnteriorResult.data ?? []) as ApuracaoRowComDetalhe[]
  const apuracoesAnterior: ApuracaoResumo[] = apuracoesAnteriorComDetalhe.map(({ detalhe, ...resto }) => ({
    ...resto,
    qtd_placas_ativadas: detalhe?.placasAtivadas?.length ?? 0,
  }))
  const apuracaoAnteriorPorConsultor = new Map(apuracoesAnterior.map((a) => [a.cod_consultor, a]))

  const jobs = (jobsResult.data ?? []) as (JobResumo & { cod_consultor: number })[]
  const jobPorConsultor = new Map(jobs.map((j) => [j.cod_consultor, j]))

  const equipesDisponiveis = Array.from(new Set(consultores.map((c) => c.equipe).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  )

  const linhasIniciais = consultores
    .filter((c) => c.situacao === 'Ativo')
    .map((consultor: Consultor) => ({
      consultor,
      apuracao: apuracaoPorConsultor.get(consultor.cod_consultor) ?? null,
      apuracaoAnterior: apuracaoAnteriorPorConsultor.get(consultor.cod_consultor) ?? null,
      job: jobPorConsultor.get(consultor.cod_consultor) ?? null,
    }))

  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
  const dataInicioPadrao = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFimPadrao = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaDoMes).padStart(2, '0')}`

  const qsAtual = `ano=${ano}&mes=${mes}`

  // Timestamp mais recente entre as apurações já geradas neste mês — exibido no cabeçalho
  // ("Última atualização"). Não é um dado novo, só o maior `gerado_em` já gravado.
  const ultimaAtualizacao = apuracoes.reduce<string | null>(
    (max, a) => (!max || a.gerado_em > max ? a.gerado_em : max),
    null
  )

  return (
    <div className="space-y-6">
      <TabelaGestor
        linhasIniciais={linhasIniciais}
        equipesDisponiveis={equipesDisponiveis}
        ano={ano}
        mes={mes}
        qsAtual={qsAtual}
        equipeInicial={equipeInicial}
        buscaInicial={buscaInicial}
        sortInicial={sortInicial}
        dirInicial={dirInicial}
        periodoLabel={`${NOMES_MESES[mes - 1]} ${ano}`}
        ultimaAtualizacao={ultimaAtualizacao}
      />

      <Cartao className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Relatório resumido por período (PDF)</p>
          <p className="text-xs text-slate-400">
            Escolha o intervalo de datas e, opcionalmente, uma equipe. Sem equipe selecionada, o
            PDF sai organizado com uma seção separada por equipe.
          </p>
        </div>
        <form
          method="GET"
          action="/api/relatorios/consolidado"
          target="_blank"
          className="ml-auto flex items-end gap-3"
        >
          <div>
            <label htmlFor="equipe_consolidado" className="block text-xs font-medium text-slate-500">
              Equipe
            </label>
            <select
              id="equipe_consolidado"
              name="equipe"
              defaultValue=""
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            >
              <option value="">Todas as equipes (separadas no PDF)</option>
              {equipesDisponiveis.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="data_inicio" className="block text-xs font-medium text-slate-500">
              Data inicial
            </label>
            <input
              id="data_inicio"
              name="data_inicio"
              type="date"
              defaultValue={dataInicioPadrao}
              required
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <div>
            <label htmlFor="data_fim" className="block text-xs font-medium text-slate-500">
              Data final
            </label>
            <input
              id="data_fim"
              name="data_fim"
              type="date"
              defaultValue={dataFimPadrao}
              required
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <Botao type="submit" variante="secundaria">
            Baixar PDF
          </Botao>
        </form>
      </Cartao>
    </div>
  )
}
