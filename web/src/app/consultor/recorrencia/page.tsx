import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { carregarContextoConsultor } from '../dados'
import { formatarDataBr, formatarMoeda, formatarReferencia, juntarItens } from '../tipos'
import { Banner } from '@/lib/ui/banner'

export default async function RecorrenciaPage({
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
  const recorrencias = juntarItens(linhasEquipe, 'recorrencias')
  const total = recorrencias.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Recorrência"
        voltarHref={`/consultor?${qs}`}
        pdfHref={`/api/relatorios/consultor?tipo=recorrencia&cod_consultor=${codConsultor}&${qs}`}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Data Pagamento</th>
              <th className="px-4 py-2 font-medium">Referência</th>
              <th className="px-4 py-2 font-medium">Cód. Boleto</th>
              <th className="px-4 py-2 font-medium">Associado</th>
              <th className="px-4 py-2 font-medium">Placa</th>
              <th className="px-4 py-2 font-medium">Consultor</th>
              <th className="px-4 py-2 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {recorrencias.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{formatarDataBr(item.dt_pagamento)}</td>
                <td className="px-4 py-2 text-slate-400">{formatarReferencia(item.referencia)}</td>
                <td className="px-4 py-2 text-slate-400">{item.cod_cobranca}</td>
                <td className="px-4 py-2">{item.associado}</td>
                <td className="px-4 py-2">{item.placa}</td>
                <td className="px-4 py-2">{item.consultorNome}</td>
                <td className="px-4 py-2 text-right">{formatarMoeda(item.valor)}</td>
              </tr>
            ))}
            {recorrencias.length === 0 && (
              <LinhaVazia colSpan={7} texto="Nenhuma recorrência no período." />
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={6}>Total ({recorrencias.length} recorrências)</td>
              <td className="px-4 py-2 text-right">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
