'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Consultor } from '@/types/domain'

export interface ApuracaoResumo {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  gerado_em: string
}

export interface LinhaGestorProps {
  consultor: Consultor
  apuracao: ApuracaoResumo | null
}

type LinhaGestor = LinhaGestorProps

const COMPARADORES: Record<string, (a: LinhaGestor, b: LinhaGestor) => number> = {
  nome: (a, b) => a.consultor.nome.localeCompare(b.consultor.nome),
  equipe: (a, b) => (a.consultor.equipe || '').localeCompare(b.consultor.equipe || ''),
  adesao: (a, b) => (a.apuracao?.total_adesao ?? 0) - (b.apuracao?.total_adesao ?? 0),
  recorrencia: (a, b) => (a.apuracao?.total_recorrencia ?? 0) - (b.apuracao?.total_recorrencia ?? 0),
  desconto: (a, b) => (a.apuracao?.total_desconto_rastreador ?? 0) - (b.apuracao?.total_desconto_rastreador ?? 0),
  liquido: (a, b) => (a.apuracao?.total_liquido ?? 0) - (b.apuracao?.total_liquido ?? 0),
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Filtro (equipe/busca) e ordenação de coluna acontecem 100% no cliente, sobre os dados já
// carregados — sem isso, cada clique disparava uma navegação nova que refazia a busca no Ileva +
// Supabase, o que dava a sensação de "sistema lento" reportada em 18/07/2026 (mesmo depois de
// cachear listarTodosConsultores, um round-trip ao servidor só pra ordenar uma coluna já
// carregada continuava sendo trabalho desnecessário).
export function TabelaGestor({
  linhasIniciais,
  equipesDisponiveis,
  ano,
  mes,
  qsAtual,
  equipeInicial,
  buscaInicial,
  sortInicial,
  dirInicial,
}: {
  linhasIniciais: LinhaGestorProps[]
  equipesDisponiveis: string[]
  ano: number
  mes: number
  qsAtual: string
  equipeInicial: string
  buscaInicial: string
  sortInicial: string
  dirInicial: 'asc' | 'desc'
}) {
  const [equipe, setEquipe] = useState(equipeInicial)
  const [busca, setBusca] = useState(buscaInicial)
  const [sortCampo, setSortCampo] = useState(sortInicial)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(dirInicial)

  const linhas = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    return linhasIniciais
      .filter((l) => !equipe || l.consultor.equipe === equipe)
      .filter(
        (l) =>
          !buscaLower ||
          l.consultor.nome.toLowerCase().includes(buscaLower) ||
          String(l.consultor.cod_consultor) === buscaLower
      )
      .sort((a, b) => {
        if (sortCampo && COMPARADORES[sortCampo]) {
          const resultado = COMPARADORES[sortCampo](a, b)
          return sortDir === 'asc' ? resultado : -resultado
        }
        if (a.apuracao && !b.apuracao) return -1
        if (!a.apuracao && b.apuracao) return 1
        if (a.apuracao && b.apuracao) return b.apuracao.total_liquido - a.apuracao.total_liquido
        return a.consultor.nome.localeCompare(b.consultor.nome)
      })
  }, [linhasIniciais, equipe, busca, sortCampo, sortDir])

  const totalLiquidoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_liquido ?? 0), 0)
  const totalAdesaoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_adesao ?? 0), 0)
  const totalRecorrenciaGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_recorrencia ?? 0), 0)
  const geradosCount = linhas.filter((l) => l.apuracao).length

  const qsFiltros = new URLSearchParams({
    ano: String(ano),
    mes: String(mes),
    ...(equipe ? { equipe } : {}),
    ...(busca ? { q: busca } : {}),
  }).toString()

  function clicarOrdenar(campo: string, direcaoPadrao: 'asc' | 'desc') {
    if (sortCampo === campo) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCampo(campo)
      setSortDir(direcaoPadrao)
    }
  }

  function indicadorOrdenacao(campo: string) {
    if (sortCampo !== campo) return null
    return sortDir === 'asc' ? '▲' : '▼'
  }

  function limparFiltros() {
    setEquipe('')
    setBusca('')
    setSortCampo('')
    setSortDir('desc')
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
        <button
          type="button"
          onClick={() => clicarOrdenar(campo, direcaoPadrao)}
          className="flex items-center gap-1 hover:text-slate-800"
        >
          {label} <span className="text-slate-400">{indicadorOrdenacao(campo)}</span>
        </button>
      </th>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="equipe" className="block text-xs font-medium text-slate-500">Equipe</label>
          <select
            id="equipe"
            value={equipe}
            onChange={(e) => setEquipe(e.target.value)}
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
            type="text"
            placeholder="Nome ou código"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="mt-1 w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        {(equipe || busca || sortCampo) && (
          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Apuração detalhada de todos os consultores (PDF)</p>
          <p className="text-xs text-slate-400">
            Baixa uma seção separada por consultor para {NOMES_MESES[mes - 1]}/{ano}, organizada por
            equipe
            {equipe ? ` (só "${equipe}", pelo filtro de Equipe acima)` : ' (todas as equipes)'}
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
