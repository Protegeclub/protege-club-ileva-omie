import { Banner } from '@/lib/ui/banner'
import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { carregarContextoConsultor } from '../dados'
import { TabelaAdesoes } from '../tabelas-listagem'
import { juntarItens } from '../tipos'

export default async function AdesoesPage({
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
  const adesoes = juntarItens(linhasEquipe, 'adesoes')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Associados referente às adesões (a receber) no período"
        voltarHref={`/consultor?${qs}`}
      />

      <TabelaAdesoes linhas={adesoes} />
    </div>
  )
}
