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

export default async function GestorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

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

  const linhas = consultores
    .filter((c) => c.situacao === 'Ativo')
    .map((consultor: Consultor) => ({
      consultor,
      apuracao: apuracaoPorConsultor.get(consultor.cod_consultor) ?? null,
    }))
    .sort((a, b) => {
      // Gerados primeiro (maior valor líquido primeiro), depois os pendentes por nome.
      if (a.apuracao && !b.apuracao) return -1
      if (!a.apuracao && b.apuracao) return 1
      if (a.apuracao && b.apuracao) return b.apuracao.total_liquido - a.apuracao.total_liquido
      return a.consultor.nome.localeCompare(b.consultor.nome)
    })

  const totalLiquidoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_liquido ?? 0), 0)
  const totalAdesaoGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_adesao ?? 0), 0)
  const totalRecorrenciaGeral = linhas.reduce((soma, l) => soma + (l.apuracao?.total_recorrencia ?? 0), 0)
  const geradosCount = linhas.filter((l) => l.apuracao).length

  return (
    <div className="space-y-6">
      <form method="GET" className="flex items-end gap-3">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardResumo titulo="Total líquido do mês" valor={formatarMoeda(totalLiquidoGeral)} />
        <CardResumo titulo="Total adesão" valor={formatarMoeda(totalAdesaoGeral)} />
        <CardResumo titulo="Total recorrência" valor={formatarMoeda(totalRecorrenciaGeral)} />
        <CardResumo titulo="Apurações geradas" valor={`${geradosCount} / ${linhas.length}`} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Consultor</th>
              <th className="px-4 py-2 font-medium">Equipe</th>
              <th className="px-4 py-2 font-medium">Adesão</th>
              <th className="px-4 py-2 font-medium">Recorrência</th>
              <th className="px-4 py-2 font-medium">Desconto rastreador</th>
              <th className="px-4 py-2 font-medium">Líquido</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ consultor, apuracao }) => (
              <tr key={consultor.cod_consultor} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {consultor.nome} <span className="text-slate-400">#{consultor.cod_consultor}</span>
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
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-2 text-slate-400">
                    Apuração ainda não gerada para {NOMES_MESES[mes - 1]}/{ano} — gerar no painel
                    Comercial
                  </td>
                )}
              </tr>
            ))}
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
