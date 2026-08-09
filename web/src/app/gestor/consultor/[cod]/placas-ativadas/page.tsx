import { formatarDataBr, juntarItens } from '@/app/consultor/tipos'
import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { carregarContextoGestorConsultor } from '../dados'

export default async function GestorPlacasAtivadasPage({
  params,
  searchParams,
}: {
  params: Promise<{ cod: string }>
  searchParams: Promise<{ ano?: string; mes?: string; equipe?: string }>
}) {
  const { cod } = await params
  const codConsultor = Number(cod)
  const sp = await searchParams
  const contexto = await carregarContextoGestorConsultor(codConsultor, sp)

  if ('erro' in contexto) {
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, equipeAtiva, linhasEquipe } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const placas = juntarItens(linhasEquipe, 'placasAtivadas')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Placas ativadas (contrato iniciado) no período"
        voltarHref={`/gestor/consultor/${codConsultor}?${qs}`}
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
