import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TabelaInadimplentes } from '../tabelas-listagem'
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
  const totalRecorrenciaEstimada = linha?.detalhe?.totalRecorrenciaEstimadaInadimplentes ?? 0

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Inadimplentes" voltarHref="/consultor" />

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

          <TabelaInadimplentes linhas={inadimplentes} />
        </>
      )}
    </div>
  )
}
