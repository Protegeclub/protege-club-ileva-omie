import Link from 'next/link'
import { formatarMoeda, juntarItens } from '@/app/consultor/tipos'
import { carregarContextoGestorConsultor } from '../dados'

export default async function GestorRastreadoresPage({
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
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{contexto.erro}</div>
  }

  const { ano, mes, equipeAtiva, linhasEquipe } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const descontos = juntarItens(linhasEquipe, 'descontosRastreador')
  const total = descontos.reduce((soma, item) => soma + item.valor, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/gestor/consultor/${codConsultor}?${qs}`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Voltar
        </Link>
        <h2 className="text-base font-semibold text-slate-900">Desconto Rastreadores</h2>
        <a
          href={`/api/relatorios/consultor?tipo=rastreadores&cod_consultor=${codConsultor}&${qs}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Baixar PDF
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-800 text-white">
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
                <td className="px-4 py-2">{item.dt_contrato}</td>
                <td className="px-4 py-2">{item.associado}</td>
                <td className="px-4 py-2">{item.placa}</td>
                <td className="px-4 py-2">{item.consultorNome}</td>
                <td className="px-4 py-2 text-right">{formatarMoeda(item.valor)}</td>
              </tr>
            ))}
            {descontos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum desconto de rastreador no período.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={4}>Total</td>
              <td className="px-4 py-2 text-right">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
