import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { carregarContextoConsultor } from '../dados'
import { formatarDataBr, formatarMoeda, juntarItens } from '../tipos'

export default async function RastreadoresPage({
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
  const descontos = juntarItens(linhasEquipe, 'descontosRastreador')
  const total = descontos.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Desconto Rastreadores"
        voltarHref={`/consultor?${qs}`}
        pdfHref={`/api/relatorios/consultor?tipo=rastreadores&cod_consultor=${codConsultor}&${qs}`}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Contrato</th>
              <th className="px-4 py-2 font-medium">Associado</th>
              <th className="px-4 py-2 font-medium">Placa</th>
              <th className="px-4 py-2 font-medium">Consultor</th>
              <th className="px-4 py-2 font-medium text-right">Valor a ser descontado</th>
            </tr>
          </thead>
          <tbody>
            {descontos.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{formatarDataBr(item.dt_contrato)}</td>
                <td className="px-4 py-2">{item.associado}</td>
                <td className="px-4 py-2">{item.placa}</td>
                <td className="px-4 py-2">{item.consultorNome}</td>
                <td className="px-4 py-2 text-right">{formatarMoeda(item.valor)}</td>
              </tr>
            ))}
            {descontos.length === 0 && (
              <LinhaVazia colSpan={5} texto="Nenhum desconto de rastreador no período." />
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={4}>Total</td>
              <td className="px-4 py-2 text-right">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
