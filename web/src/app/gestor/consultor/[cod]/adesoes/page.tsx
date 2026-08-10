import { juntarItens } from '@/app/consultor/tipos'
import { TabelaAdesoes } from '@/app/consultor/tabelas-listagem'
import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { carregarContextoGestorConsultor } from '../dados'

export default async function GestorAdesoesPage({
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
  const adesoes = juntarItens(linhasEquipe, 'adesoes')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Associados referente às adesões (a receber) no período"
        voltarHref={`/gestor/consultor/${codConsultor}?${qs}`}
      />

      <TabelaAdesoes linhas={adesoes} />
    </div>
  )
}
