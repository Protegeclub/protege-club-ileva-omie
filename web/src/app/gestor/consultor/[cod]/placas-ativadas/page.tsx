import { juntarItens } from '@/app/consultor/tipos'
import { TabelaPlacasAtivadas } from '@/app/consultor/tabelas-listagem'
import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
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
      />

      <p className="text-xs text-slate-400">
        Veículos cujo contrato começou no período — visão operacional (igual ao painel
        &quot;Ativações&quot; do Ileva), diferente da comissão de adesão (que só conta quando o
        boleto é efetivamente pago).
      </p>

      <TabelaPlacasAtivadas linhas={placas} />
    </div>
  )
}
