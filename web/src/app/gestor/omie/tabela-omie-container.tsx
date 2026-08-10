import { Cartao } from '@/lib/ui/cartao'
import { buscarDadosOmiePeriodo } from './actions'
import { TabelaOmie } from './tabela-omie'

export async function TabelaOmieContainer({ ano, mes }: { ano: number; mes: number }) {
  const dados = await buscarDadosOmiePeriodo(ano, mes)

  if ('erro' in dados) {
    return <Cartao className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{dados.erro}</Cartao>
  }

  return (
    <>
      {dados.avisoSugestoes && (
        <Cartao className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {dados.avisoSugestoes}
        </Cartao>
      )}
      <TabelaOmie
        linhasIniciais={dados.linhas}
        configuracaoInicial={dados.configuracao}
        ano={ano}
        mes={mes}
      />
    </>
  )
}
