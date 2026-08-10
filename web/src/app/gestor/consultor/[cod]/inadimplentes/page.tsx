import Link from 'next/link'
import type { ApuracaoRow } from '@/app/consultor/tipos'
import { formatarDataBr, formatarMoeda, formatarTelefone } from '@/app/consultor/tipos'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Estado atual (quem está atrasado agora), igual web/src/app/consultor/inadimplentes/page.tsx —
// mas para o Gestor ver de qualquer consultor, direto pelo cliente admin (sem RLS por perfil).
export default async function GestorInadimplentesPage({
  params,
}: {
  params: Promise<{ cod: string }>
}) {
  const { cod } = await params
  const codConsultor = Number(cod)

  const admin = createSupabaseAdminClient()
  const { data: linha } = await admin
    .from('apuracoes_mensais')
    .select('ano, mes, detalhe')
    .eq('cod_consultor', codConsultor)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)
    .maybeSingle<Pick<ApuracaoRow, 'ano' | 'mes' | 'detalhe'>>()

  const inadimplentes = linha?.detalhe?.inadimplentes ?? []
  const totalBoletos = inadimplentes.reduce((soma, i) => soma + i.valorBoleto, 0)
  const totalRecorrenciaEstimada = linha?.detalhe?.totalRecorrenciaEstimadaInadimplentes ?? 0

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Inadimplentes"
        voltarHref={`/gestor/consultor/${codConsultor}`}
      />

      {!linha ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nenhuma apuração gerada ainda para este consultor —{' '}
          <Link href="/gestor/gerar" className="text-brand-navy underline hover:text-brand-navy-hover">
            gere agora
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Valor estimado de recorrência a receber em caso de pagamento
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatarMoeda(totalRecorrenciaEstimada)}
              </p>
            </div>
            <p className="max-w-xs self-center text-xs text-slate-400">
              Baseado na apuração de {String(linha.mes).padStart(2, '0')}/{linha.ano} — gere uma
              nova apuração para atualizar esta lista.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Associado</th>
                  <th className="px-4 py-2 font-medium">Telefone</th>
                  <th className="px-4 py-2 font-medium">Consultor</th>
                  <th className="px-4 py-2 font-medium text-right">Valor boleto</th>
                </tr>
              </thead>
              <tbody>
                {inadimplentes.map((item, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2">{formatarDataBr(item.dt_vencimento)}</td>
                    <td className="px-4 py-2">{item.associado}</td>
                    <td className="px-4 py-2">{formatarTelefone(item.telefone)}</td>
                    <td className="px-4 py-2">{item.consultorNome}</td>
                    <td className="px-4 py-2 text-right">{formatarMoeda(item.valorBoleto)}</td>
                  </tr>
                ))}
                {inadimplentes.length === 0 && (
                  <LinhaVazia colSpan={5} texto="Nenhum inadimplente na carteira." />
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
                  <td className="px-4 py-2" colSpan={4}>Total</td>
                  <td className="px-4 py-2 text-right">{formatarMoeda(totalBoletos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
