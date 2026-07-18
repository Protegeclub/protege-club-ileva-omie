import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Consultor } from '@/types/domain'

interface ApuracaoResumo {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  gerado_em: string
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type LinhaGestor = { consultor: Consultor; apuracao: ApuracaoResumo | null }

const COMPARADORES: Record<string, (a: LinhaGestor, b: LinhaGestor) => number> = {
  nome: (a, b) => a.consultor.nome.localeCompare(b.consultor.nome),
  equipe: (a, b) => (a.consultor.equipe || '').localeCompare(b.consultor.equipe || ''),
  adesao: (a, b) => (a.apuracao?.total_adesao ?? 0) - (b.apuracao?.total_adesao ?? 0),
  recorrencia: (a, b) => (a.apuracao?.total_recorrencia ?? 0) - (b.apuracao?.total_recorrencia ?? 0),
  desconto: (a, b) => (a.apuracao?.total_desconto_rastreador ?? 0) - (b.apuracao?.total_desconto_rastreador ?? 0),
  liquido: (a, b) => (a.apuracao?.total_liquido ?? 0) - (b.apuracao?.total_liquido ?? 0),
}

export default async function GestorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string; q?: string; sort?: string; dir?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1
  const equipeFiltro = (params.equipe ?? '').trim()
  const busca = (params.q ?? '').trim()
  const buscaLower = busca.toLowerCase()
  const sortCampo = (params.sort ?? '').trim()
  const sortDir: 'asc' | 'desc' = params.dir === 'asc' ? 'asc' : 'desc'

  // Visão consolidada: cruza o cadastro de consultores do Ileva (~245 hoje, chamada rápida —
  // diferente do problema de escala por veículo, ver lib/apuracao/mensal.ts) com o que já foi
  // gerado no Supabase para o mês selecionado. Usa o cliente admin porque a RLS de
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

  const linhas = consultores
    .filter((c) => c.situacao === 'Ativo')
    .filter((c) => !equipeFiltro || c.equipe === equipeFiltro)
    .filter(
      (c) =>
        !buscaLower ||
        c.nome.toLowerCase().includes(buscaLower) ||
        String(c.cod_consultor) === buscaLower
    )
    .map((consultor: Consultor) => ({
      consultor,
      apuracao: apuracaoPorConsultor.get(consultor.cod_consultor) ?? null,
    }))
    .sort((a, b) => {
      if (sortCampo && COMPARADORES[sortCampo]) {
        const resultado = COMPARADORES[sortCampo](a, b)
        return sortDir === 'asc' ? resultado : -resultado
      }
      // Padrão (sem coluna clicada): gerados primeiro (maior valor líquido primeiro), depois os
      // pendentes por nome.
      if (a.apuracao && !b.apuracao) return -1
      if (!a.apuracao && b.apuracao) return 1
      if (a.apuracao && b.apuracao) return b.apuracao.total_liquido - a.apuracao.total_liquido
      return a.consultor.nome.localeCompare(b.consultor.nome)
    })

  const totalLiquidoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_liquido ?? 0), 0)
  const totalAdesaoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_adesao ?? 0), 0)
  const totalRecorrenciaGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_recorrencia ?? 0), 0)
  const geradosCount = linhas.filter((l) => l.apuracao).length

  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate()
  const dataInicioPadrao = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFimPadrao = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaDoMes).padStart(2, '0')}`

  const qsAtual = `ano=${ano}&mes=${mes}`
  const qsFiltros = new URLSearchParams({
    ano: String(ano),
    mes: String(mes),
    ...(equipeFiltro ? { equipe: equipeFiltro } : {}),
    ...(busca ? { q: busca } : {}),
  }).toString()

  function linkOrdenacao(campo: string, direcaoPadrao: 'asc' | 'desc' = 'desc') {
    const novaDirecao = sortCampo === campo ? (sortDir === 'asc' ? 'desc' : 'asc') : direcaoPadrao
    return `/gestor?${qsFiltros}&sort=${campo}&dir=${novaDirecao}`
  }

  function indicadorOrdenacao(campo: string) {
    if (sortCampo !== campo) return null
    return sortDir === 'asc' ? '▲' : '▼'
  }

  function ThOrdenavel({
    campo,
    label,
    direcaoPadrao = 'desc',
  }: {
    campo: string
    label: string
    direcaoPadrao?: 'asc' | 'desc'
  }) {
    return (
      <th className="px-4 py-2 font-medium">
        <Link href={linkOrdenacao(campo, direcaoPadrao)} className="flex items-center gap-1 hover:text-slate-800">
          {label} <span className="text-slate-400">{indicadorOrdenacao(campo)}</span>
        </Link>
      </th>
    )
  }

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
        <div>
          <label htmlFor="equipe" className="block text-xs font-medium text-slate-500">Equipe</label>
          <select
            id="equipe"
            name="equipe"
            defaultValue={equipeFiltro}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todas as equipes</option>
            {equipesDisponiveis.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q" className="block text-xs font-medium text-slate-500">Buscar consultor</label>
          <input
            id="q"
            name="q"
            type="text"
            placeholder="Nome ou código"
            defaultValue={busca}
            className="mt-1 w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
          Ver
        </button>
        {(equipeFiltro || busca || sortCampo) && (
          <Link
            href={`/gestor?${qsAtual}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Apuração detalhada de todos os consultores (PDF)</p>
          <p className="text-xs text-slate-400">
            Baixa uma seção separada por consultor para {NOMES_MESES[mes - 1]}/{ano}, organizada por
            equipe
            {equipeFiltro ? ` (só "${equipeFiltro}", pelo filtro de Equipe acima)` : ' (todas as equipes)'}
            {busca ? `, filtrado por "${busca}"` : ''} — respeita os filtros acima ({linhas.length} consultor(es)).
            Pra baixar só uma equipe, selecione-a no filtro "Equipe" acima antes de baixar.
          </p>
        </div>
        <a
          href={`/api/relatorios/gestor/todos?${qsFiltros}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Baixar PDF de todos
        </a>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardResumo titulo="Total líquido do mês" valor={formatarMoeda(totalLiquidoGeral)} />
        <CardResumo titulo="Total adesão" valor={formatarMoeda(totalAdesaoGeral)} />
        <CardResumo titulo="Total recorrência" valor={formatarMoeda(totalRecorrenciaGeral)} />
        <CardResumo titulo="Apurações geradas" valor={`${geradosCount} / ${linhas.length}`} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <ThOrdenavel campo="nome" label="Consultor" direcaoPadrao="asc" />
              <ThOrdenavel campo="equipe" label="Equipe" direcaoPadrao="asc" />
              <ThOrdenavel campo="adesao" label="Adesão" />
              <ThOrdenavel campo="recorrencia" label="Recorrência" />
              <ThOrdenavel campo="desconto" label="Desconto rastreador" />
              <ThOrdenavel campo="liquido" label="Líquido" />
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ consultor, apuracao }) => (
              <tr key={consultor.cod_consultor} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  <Link
                    href={`/gestor/consultor/${consultor.cod_consultor}?${qsAtual}`}
                    className="hover:underline"
                  >
                    {consultor.nome}
                  </Link>{' '}
                  <span className="text-slate-400">#{consultor.cod_consultor}</span>
                </td>
                <td className="px-4 py-2 text-slate-500">{consultor.equipe}</td>
                {apuracao ? (
                  <>
                    <td className="px-4 py-2">{formatarMoeda(apuracao.total_adesao)}</td>
                    <td className="px-4 py-2">{formatarMoeda(apuracao.total_recorrencia)}</td>
                    <td className="px-4 py-2">{formatarMoeda(apuracao.total_desconto_rastreador)}</td>
                    <td className="px-4 py-2 font-medium">{formatarMoeda(apuracao.total_liquido)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        Gerado
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        <Link
                          href={`/gestor/consultor/${consultor.cod_consultor}?${qsAtual}`}
                          className="text-xs font-medium text-slate-600 hover:underline"
                        >
                          Ver detalhes
                        </Link>
                        <a
                          href={`/api/relatorios/consultor?tipo=dashboard&cod_consultor=${consultor.cod_consultor}&${qsAtual}&equipe=0`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          PDF individual
                        </a>
                      </div>
                    </td>
                  </>
                ) : (
                  <td colSpan={6} className="px-4 py-2 text-slate-400">
                    Apuração ainda não gerada para {NOMES_MESES[mes - 1]}/{ano} —{' '}
                    <Link href="/gestor/gerar" className="underline hover:text-slate-600">
                      gerar agora
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum consultor encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CardResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{valor}</p>
    </div>
  )
}
