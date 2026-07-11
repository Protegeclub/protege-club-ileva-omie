import Link from 'next/link'
import { carregarContextoConsultor } from '../dados'
import { formatarMoeda, juntarItens } from '../tipos'

export default async function AdesoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string }>
}) {
  const params = await searchParams
  const contexto = await carregarContextoConsultor(params)

  if ('erro' in contexto) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{contexto.erro}</div>
  }

  const { ano, mes, equipeAtiva, linhasEquipe, codConsultor } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const adesoes = juntarItens(linhasEquipe, 'adesoes')
  const total = adesoes.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/consultor?${qs}`} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Voltar
        </Link>
        <h2 className="text-base font-semibold text-slate-900">
          Associados referente às adesões (a receber) no período
        </h2>
        <a
          href={`/api/relatorios/consultor?tipo=adesoes&cod_consultor=${codConsultor}&${qs}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Baixar PDF
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Data Pagamento</th>
              <th className="px-4 py-2 font-medium">Associado</th>
              <th className="px-4 py-2 font-medium">Consultor</th>
              <th className="px-4 py-2 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {adesoes.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{item.dt_pagamento ?? '—'}</td>
                <td className="px-4 py-2">{item.associado}</td>
                <td className="px-4 py-2">{item.consultorNome}</td>
                <td className="px-4 py-2 text-right">{formatarMoeda(item.valor)}</td>
              </tr>
            ))}
            {adesoes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma adesão no período.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={3}>Total</td>
              <td className="px-4 py-2 text-right">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
