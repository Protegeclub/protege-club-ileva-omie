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
  // Apurações geradas antes do item ganhar `cod_consultor` embutido (ver mensal.ts) ainda têm
  // esse campo ausente no detalhe salvo — completa com o cod_consultor da própria linha (sempre
  // correto, já que cada linha em linhasEquipe é a apuração de um único consultor) em vez de
  // usar juntarItens puro, que deixaria o item sem dono nesses casos legados.
  const descontos = linhasEquipe.flatMap((linha) =>
    (linha.detalhe?.descontosRastreador ?? []).map((item) => ({
      ...item,
      cod_consultor: item.cod_consultor ?? linha.cod_consultor,
    }))
  )

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
