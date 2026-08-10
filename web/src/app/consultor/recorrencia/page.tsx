import { CabecalhoPagina } from '@/lib/ui/cabecalho-pagina'
import { carregarContextoConsultor } from '../dados'
import { TabelaRecorrencia } from '../tabelas-listagem'
import { juntarItens } from '../tipos'
import { Banner } from '@/lib/ui/banner'

export default async function RecorrenciaPage({
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
  const recorrencias = juntarItens(linhasEquipe, 'recorrencias')

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Recorrência"
        voltarHref={`/consultor?${qs}`}
      />

      <TabelaRecorrencia linhas={recorrencias} />
    </div>
  )
}
