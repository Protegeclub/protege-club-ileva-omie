import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
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
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, equipeAtiva, linhasEquipe, codConsultor } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const adesoes = juntarItens(linhasEquipe, 'adesoes')
  const total = adesoes.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Associados referente às adesões (a receber) no período"
        voltarHref={`/consultor?${qs}`}
        pdfHref={`/api/relatorios/consultor?tipo=adesoes&cod_consultor=${codConsultor}&${qs}`}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-brand-navy text-white">
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
            <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={3}>Total</td>
              <td className="px-4 py-2 text-right">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
