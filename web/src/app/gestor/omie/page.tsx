import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { buscarDadosOmiePeriodo } from './actions'
import { TabelaOmie } from './tabela-omie'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function GestorOmiePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

  const dados = await buscarDadosOmiePeriodo(ano, mes)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Integração Omie</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Cria o título a pagar de cada consultor no financeiro do Omie a partir da apuração já
            gerada. Nada é enviado automaticamente — cada envio é uma ação explícita, feita um
            consultor por vez, depois de você confirmar o vínculo e conferir o valor.
          </p>
        </div>
      </div>

      <Cartao className="flex flex-wrap items-end gap-3 p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="mes" className="block text-xs font-medium text-slate-500">Mês</label>
            <select
              id="mes"
              name="mes"
              defaultValue={mes}
              className="mt-1.5 h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {NOMES_MESES.map((nomeMes, i) => (
                <option key={nomeMes} value={i + 1}>{nomeMes}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ano" className="block text-xs font-medium text-slate-500">Ano</label>
            <input
              id="ano"
              name="ano"
              type="number"
              defaultValue={ano}
              className="mt-1.5 h-11 w-24 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <Botao type="submit" variante="primaria" className="h-11">Ver competência</Botao>
        </form>
      </Cartao>

      {'erro' in dados ? (
        <Cartao className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{dados.erro}</Cartao>
      ) : (
        <TabelaOmie
          linhasIniciais={dados.linhas}
          configuracaoInicial={dados.configuracao}
          ano={ano}
          mes={mes}
        />
      )}
    </div>
  )
}
