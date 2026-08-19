import { juntarItens } from '@/app/consultor/tipos'
import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { carregarContextoGestorConsultor } from '../dados'
import { TabelaRastreadoresGestor } from './tabela-rastreadores-gestor'

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
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, equipeAtiva, linhasEquipe } = contexto
  const qs = `ano=${ano}&mes=${mes}&equipe=${equipeAtiva ? 1 : 0}`
  const descontos = juntarItens(linhasEquipe, 'descontosRastreador')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Desconto Rastreadores"
        voltarHref={`/gestor/consultor/${codConsultor}?${qs}`}
      />

      <TabelaRastreadoresGestor linhas={descontos} ano={ano} mes={mes} />
    </div>
  )
}
