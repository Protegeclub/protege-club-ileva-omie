'use client'

import type {
  AdesaoItem,
  DescontoRastreadorItem,
  InadimplenteItem,
  PlacaAtivadaItem,
  RecorrenciaItem,
} from '@/lib/apuracao/mensal'
import { TabelaListagem, type ColunaTabelaListagem } from '@/lib/ui/tabela-listagem'
import { formatarDataBr, formatarMoeda, formatarReferencia, formatarTelefone } from './tipos'

// As 5 tabelas de detalhe (Adesões/Recorrência/Rastreadores/Placas/Inadimplentes) precisam ser
// Client Components pra ter busca/ordenação — mas as páginas que as usam (Gestor + Consultor) são
// Server Components. Funções (colunas, rodapé) não podem cruzar essa fronteira como prop, então
// ficam definidas aqui dentro, recebendo só os dados (serializáveis) das páginas.

export function TabelaRecorrencia({ linhas }: { linhas: RecorrenciaItem[] }) {
  const colunas: ColunaTabelaListagem<RecorrenciaItem>[] = [
    { chave: 'dt_pagamento', titulo: 'Data Pagamento', texto: (i) => formatarDataBr(i.dt_pagamento), ordenar: (i) => i.dt_pagamento ?? '' },
    {
      chave: 'referencia',
      titulo: 'Referência',
      texto: (i) => formatarReferencia(i.referencia),
      ordenar: (i) => i.referencia ?? '',
      render: (i) => <span className="text-slate-400">{formatarReferencia(i.referencia)}</span>,
    },
    {
      chave: 'cod_cobranca',
      titulo: 'Cód. Boleto',
      texto: (i) => String(i.cod_cobranca),
      ordenar: (i) => i.cod_cobranca,
      render: (i) => <span className="text-slate-400">{i.cod_cobranca}</span>,
    },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'placa', titulo: 'Placa', texto: (i) => i.placa, ordenar: (i) => i.placa },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
    { chave: 'valor', titulo: 'Valor', alinhar: 'right', texto: (i) => formatarMoeda(i.valor), ordenar: (i) => i.valor },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhas}
      textoVazio="Nenhuma recorrência no período."
      larguraMinima={640}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={6}>Total ({linhasFiltradas.length} recorrências)</td>
          <td className="px-4 py-2 text-right">
            {formatarMoeda(linhasFiltradas.reduce((soma, item) => soma + item.valor, 0))}
          </td>
        </tr>
      )}
    />
  )
}

export function TabelaAdesoes({ linhas }: { linhas: AdesaoItem[] }) {
  const colunas: ColunaTabelaListagem<AdesaoItem>[] = [
    { chave: 'dt_pagamento', titulo: 'Data Pagamento', texto: (i) => formatarDataBr(i.dt_pagamento), ordenar: (i) => i.dt_pagamento ?? '' },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
    { chave: 'valor', titulo: 'Valor', alinhar: 'right', texto: (i) => formatarMoeda(i.valor), ordenar: (i) => i.valor },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhas}
      textoVazio="Nenhuma adesão no período."
      larguraMinima={640}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={3}>Total</td>
          <td className="px-4 py-2 text-right">
            {formatarMoeda(linhasFiltradas.reduce((soma, item) => soma + item.valor, 0))}
          </td>
        </tr>
      )}
    />
  )
}

export function TabelaRastreadores({ linhas }: { linhas: DescontoRastreadorItem[] }) {
  const colunas: ColunaTabelaListagem<DescontoRastreadorItem>[] = [
    { chave: 'dt_contrato', titulo: 'Contrato', texto: (i) => formatarDataBr(i.dt_contrato), ordenar: (i) => i.dt_contrato },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'placa', titulo: 'Placa', texto: (i) => i.placa, ordenar: (i) => i.placa },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
    { chave: 'valor', titulo: 'Valor a ser descontado', alinhar: 'right', texto: (i) => formatarMoeda(i.valor), ordenar: (i) => i.valor },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhas}
      textoVazio="Nenhum desconto de rastreador no período."
      larguraMinima={680}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={4}>Total</td>
          <td className="px-4 py-2 text-right">
            {formatarMoeda(linhasFiltradas.reduce((soma, item) => soma + item.valor, 0))}
          </td>
        </tr>
      )}
    />
  )
}

export function TabelaPlacasAtivadas({ linhas }: { linhas: PlacaAtivadaItem[] }) {
  const colunas: ColunaTabelaListagem<PlacaAtivadaItem>[] = [
    { chave: 'dt_contrato', titulo: 'Data Contrato', texto: (i) => formatarDataBr(i.dt_contrato), ordenar: (i) => i.dt_contrato },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'placa', titulo: 'Placa', texto: (i) => i.placa, ordenar: (i) => i.placa },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhas}
      textoVazio="Nenhuma placa ativada no período."
      larguraMinima={560}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={4}>Total: {linhasFiltradas.length}</td>
        </tr>
      )}
    />
  )
}

export function TabelaInadimplentes({ linhas }: { linhas: InadimplenteItem[] }) {
  const colunas: ColunaTabelaListagem<InadimplenteItem>[] = [
    { chave: 'dt_vencimento', titulo: 'Vencimento', texto: (i) => formatarDataBr(i.dt_vencimento), ordenar: (i) => i.dt_vencimento ?? '' },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'telefone', titulo: 'Telefone', texto: (i) => formatarTelefone(i.telefone), ordenar: (i) => i.telefone ?? '' },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
    { chave: 'valorBoleto', titulo: 'Valor boleto', alinhar: 'right', texto: (i) => formatarMoeda(i.valorBoleto), ordenar: (i) => i.valorBoleto },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhas}
      textoVazio="Nenhum inadimplente na carteira."
      larguraMinima={720}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={4}>Total</td>
          <td className="px-4 py-2 text-right">
            {formatarMoeda(linhasFiltradas.reduce((soma, item) => soma + item.valorBoleto, 0))}
          </td>
        </tr>
      )}
    />
  )
}
