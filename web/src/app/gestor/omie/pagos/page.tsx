import { notFound } from 'next/navigation'
import { buscarUsuarioLogado } from '@/lib/auth/usuario-logado'
import { buscarRelatorioPagosOmie, normalizarDataFiltro } from '@/lib/omie/relatorio-pagos'
import { rotuloPeriodoPagos } from '@/lib/relatorios/omie-pagos'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { Selo } from '@/lib/ui/selo'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CLASSE_INPUT_DATA =
  'mt-1.5 h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue'

export default async function GestorOmiePagosPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>
}) {
  // Dados financeiros lidos com a chave de serviço — confere o perfil aqui também, sem depender só
  // do proxy.
  const usuario = await buscarUsuarioLogado()
  if (usuario?.perfil !== 'gestor') notFound()

  const params = await searchParams
  let de = normalizarDataFiltro(params.de)
  let ate = normalizarDataFiltro(params.ate)
  const periodoInvertido = !!de && !!ate && de > ate
  if (periodoInvertido) {
    de = undefined
    ate = undefined
  }

  const relatorio = await buscarRelatorioPagosOmie({ de, ate })

  const query = new URLSearchParams()
  if (de) query.set('de', de)
  if (ate) query.set('ate', ate)
  const linkPdf = `/api/relatorios/omie-pagos?${new URLSearchParams([...query, ['formato', 'pdf']]).toString()}`
  const linkCsv = `/api/relatorios/omie-pagos?${new URLSearchParams([...query, ['formato', 'csv']]).toString()}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Consultores pagos via Omie</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Todos os consultores que tiveram o título a pagar criado no Omie pelo sistema. O período
            filtra pela data em que o título foi registrado. Títulos estornados não entram.
          </p>
        </div>
        <Botao href="/gestor/omie" variante="fantasma">Voltar para Integração Omie</Botao>
      </div>

      <Cartao className="p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="de" className="block text-xs font-medium text-slate-500">Data inicial</label>
            <input id="de" name="de" type="date" defaultValue={de ?? ''} className={CLASSE_INPUT_DATA} />
          </div>
          <div>
            <label htmlFor="ate" className="block text-xs font-medium text-slate-500">Data final</label>
            <input id="ate" name="ate" type="date" defaultValue={ate ?? ''} className={CLASSE_INPUT_DATA} />
          </div>
          <Botao type="submit" variante="primaria" className="h-11">Ver relatório</Botao>
          <Botao href="/gestor/omie/pagos" variante="fantasma" className="h-11">Limpar período</Botao>
        </form>
        {periodoInvertido && (
          <p className="mt-3 text-sm text-red-700">
            A data inicial estava depois da final — mostrando todo o histórico.
          </p>
        )}
      </Cartao>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cartao className="p-4">
          <p className="text-xs font-medium text-slate-500">Total lançado no Omie</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatarMoeda(relatorio.totalPago)}</p>
        </Cartao>
        <Cartao className="p-4">
          <p className="text-xs font-medium text-slate-500">Consultores pagos</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{relatorio.qtdConsultores}</p>
        </Cartao>
        <Cartao className="p-4">
          <p className="text-xs font-medium text-slate-500">Títulos criados</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{relatorio.pagamentos.length}</p>
          {relatorio.qtdEstornados > 0 && (
            <p className="mt-1 text-xs text-slate-400">{relatorio.qtdEstornados} estornado(s) no período, fora da conta</p>
          )}
        </Cartao>
      </div>

      <Cartao className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-slate-600">{rotuloPeriodoPagos(de, ate)}</p>
        <div className="flex flex-wrap gap-2">
          <Botao href={linkPdf} target="_blank" rel="noreferrer" variante="destaque">Baixar relatório (PDF)</Botao>
          <Botao href={linkCsv} target="_blank" rel="noreferrer" variante="secundaria">Baixar planilha (CSV)</Botao>
        </div>
      </Cartao>

      <Cartao className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Consultor</th>
                <th className="px-4 py-3 font-medium">Competência</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Registrado em</th>
                <th className="px-4 py-3 font-medium">Fornecedor Omie</th>
                <th className="px-4 py-3 font-medium">Chave PIX</th>
                <th className="px-4 py-3 font-medium">Relatório anexado</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.pagamentos.length === 0 ? (
                <LinhaVazia colSpan={7} texto="Nenhum título enviado ao Omie neste período." />
              ) : (
                relatorio.pagamentos.map((p) => (
                  <tr
                    key={`${p.cod_consultor}-${p.ano}-${p.mes}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.nomeConsultor}</p>
                      <p className="text-xs text-slate-400">#{p.cod_consultor}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{String(p.mes).padStart(2, '0')}/{p.ano}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatarMoeda(p.valor)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(p.registradoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.fornecedorOmie ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.chavePix ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.anexoStatus === 'enviado' ? (
                        <Selo tom="sucesso">Sim</Selo>
                      ) : p.anexoStatus === 'erro' ? (
                        <Selo tom="erro">Falhou</Selo>
                      ) : (
                        <Selo tom="neutro">Não</Selo>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}
