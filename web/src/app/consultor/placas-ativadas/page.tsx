import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { carregarContextoConsultor } from '../dados'
import { formatarDataBr, juntarItens } from '../tipos'

export default async function PlacasAtivadasPage({
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
  const placas = juntarItens(linhasEquipe, 'placasAtivadas')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Placas ativadas (contrato iniciado) no período"
        voltarHref={`/consultor?${qs}`}
        pdfHref={`/api/relatorios/consultor?tipo=placas-ativadas&cod_consultor=${codConsultor}&${qs}`}
      />

      <p className="text-xs text-slate-400">
        Veículos cujo contrato começou no período — visão operacional (igual ao painel
        &quot;Ativações&quot; do Ileva), diferente da comissão de adesão (que só conta quando o
        boleto é efetivamente pago).
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Data Contrato</th>
              <th className="px-4 py-2 font-medium">Associado</th>
              <th className="px-4 py-2 font-medium">Placa</th>
              <th className="px-4 py-2 font-medium">Consultor</th>
            </tr>
          </thead>
          <tbody>
            {placas.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{formatarDataBr(item.dt_contrato)}</td>
                <td className="px-4 py-2">{item.associado}</td>
                <td className="px-4 py-2">{item.placa}</td>
                <td className="px-4 py-2">{item.consultorNome}</td>
              </tr>
            ))}
            {placas.length === 0 && (
              <LinhaVazia colSpan={4} texto="Nenhuma placa ativada no período." />
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={4}>Total: {placas.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
