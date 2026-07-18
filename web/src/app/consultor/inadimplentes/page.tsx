import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatarMoeda, type ApuracaoRow } from '../tipos'

// Inadimplência é "estado atual" (quem está atrasado agora), não um recorte de mês/ano — por
// isso não usa carregarContextoConsultor (que exige ano/mes). Pega a apuração mais recente já
// gerada para esse consultor, que é onde a lista de inadimplentes fica guardada (calculada no
// momento da geração — ver web/src/lib/apuracao/mensal.ts).
export default async function InadimplentesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return <Banner tom="aviso">Sessão expirada.</Banner>
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('cod_consultor')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfil?.cod_consultor) {
    return <Banner tom="aviso">Este usuário não está vinculado a um consultor do Ileva.</Banner>
  }

  const { data: linha } = await supabase
    .from('apuracoes_mensais')
    .select('ano, mes, detalhe')
    .eq('cod_consultor', perfil.cod_consultor)
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
        voltarHref="/consultor"
        pdfHref={
          perfil.cod_consultor
            ? `/api/relatorios/consultor?tipo=inadimplentes&cod_consultor=${perfil.cod_consultor}`
            : undefined
        }
      />

      {!linha ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nenhuma apuração gerada ainda — peça ao Gestor para gerar ao menos uma vez.
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
                    <td className="px-4 py-2">{item.dt_vencimento}</td>
                    <td className="px-4 py-2">{item.associado}</td>
                    <td className="px-4 py-2">{item.telefone || '—'}</td>
                    <td className="px-4 py-2">{item.consultorNome}</td>
                    <td className="px-4 py-2 text-right">{formatarMoeda(item.valorBoleto)}</td>
                  </tr>
                ))}
                {inadimplentes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Nenhum inadimplente na carteira.
                    </td>
                  </tr>
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
