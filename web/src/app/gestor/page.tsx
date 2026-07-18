import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Consultor } from '@/types/domain'
import { TabelaGestor, type ApuracaoResumo } from './TabelaGestor'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function GestorDashboardPage({
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

  // Visão consolidada: cruza o cadastro de consultores do Ileva (~245 hoje, cacheado por 60s —
  // ver listarTodosConsultores — pra não repetir a chamada externa a cada navegação) com o que
  // já foi gerado no Supabase para o mês selecionado. Usa o cliente admin porque a RLS de
  // apuracoes_mensais só deixa cada consultor ver a própria linha — o Gestor precisa ver todas.
  const [consultores, apuracoesResult] = await Promise.all([
    listarTodosConsultores(),
    createSupabaseAdminClient()
      .from('apuracoes_mensais')
      .select('cod_consultor, total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, gerado_em')
      .eq('ano', ano)
      .eq('mes', mes),
  ])

  const apuracoes = (apuracoesResult.data ?? []) as ApuracaoResumo[]
  const apuracaoPorConsultor = new Map(apuracoes.map((a) => [a.cod_consultor, a]))

  const equipesDisponiveis = Array.from(new Set(consultores.map((c) => c.equipe).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  )

  const linhasIniciais = consultores
    .filter((c) => c.situacao === 'Ativo')
    .map((consultor: Consultor) => ({
      consultor,
      apuracao: apuracaoPorConsultor.get(consultor.cod_consultor) ?? null,
    }))

  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
  const dataInicioPadrao = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFimPadrao = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaDoMes).padStart(2, '0')}`

  const qsAtual = `ano=${ano}&mes=${mes}`

  return (
    <div className="space-y-6">
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="mes" className="block text-xs font-medium text-slate-500">Mês</label>
          <select id="mes" name="mes" defaultValue={mes} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {NOMES_MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>{nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ano" className="block text-xs font-medium text-slate-500">Ano</label>
          <input
            id="ano"
            name="ano"
            type="number"
            defaultValue={ano}
            className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
          Ver
        </button>
      </form>

      <form
        method="GET"
        action="/api/relatorios/consolidado"
        target="_blank"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div>
          <p className="text-sm font-medium text-slate-700">Relatório resumido por período (PDF)</p>
          <p className="text-xs text-slate-400">
            Escolha o intervalo de datas e, opcionalmente, uma equipe. Sem equipe selecionada, o
            PDF sai organizado com uma seção separada por equipe.
          </p>
        </div>
        <div className="ml-auto flex items-end gap-3">
          <div>
            <label htmlFor="equipe_consolidado" className="block text-xs font-medium text-slate-500">
              Equipe
            </label>
            <select
              id="equipe_consolidado"
              name="equipe"
              defaultValue=""
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Baixar PDF
          </button>
        </div>
      </form>

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
      />
    </div>
  )
}
