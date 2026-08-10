import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { carregarContextoConsultor } from '../dados'
import { TabelaPlacasAtivadas } from '../tabelas-listagem'
import { juntarItens } from '../tipos'

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

  const { ano, mes, equipeAtiva, linhasEquipe } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const placas = juntarItens(linhasEquipe, 'placasAtivadas')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Placas ativadas (contrato iniciado) no período"
        voltarHref={`/consultor?${qs}`}
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
