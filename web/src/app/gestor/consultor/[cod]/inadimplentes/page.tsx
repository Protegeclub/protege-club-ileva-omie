import Link from 'next/link'
import type { ApuracaoRow } from '@/app/consultor/tipos'
import { formatarMoeda } from '@/app/consultor/tipos'
import { TabelaInadimplentes } from '@/app/consultor/tabelas-listagem'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
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

          <TabelaInadimplentes linhas={inadimplentes} />
        </>
      )}
    </div>
  )
}
