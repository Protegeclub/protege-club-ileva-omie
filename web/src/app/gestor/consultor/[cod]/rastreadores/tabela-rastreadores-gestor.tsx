'use client'

import { useState } from 'react'
import { formatarDataBr, formatarMoeda } from '@/app/consultor/tipos'
import type { DescontoRastreadorItem } from '@/lib/apuracao/mensal'
import { Botao } from '@/lib/ui/botao'
import { TabelaListagem, type ColunaTabelaListagem } from '@/lib/ui/tabela-listagem'
import { excluirDescontoRastreadorAction } from './actions'

// Confirmação em 2 passos (mesmo padrão do "Estornar" em gestor/omie/tabela-omie.tsx) por ser
// uma ação que muda o valor líquido a pagar do consultor.
function AcaoExcluir({
  item,
  ano,
  mes,
  onExcluido,
}: {
  item: DescontoRastreadorItem
  ano: number
  mes: number
  onExcluido: (codVeiculo: number) => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar() {
    setExcluindo(true)
    setErro('')
    const resultado = await excluirDescontoRastreadorAction(
      {
        cod_veiculo: item.cod_veiculo,
        cod_consultor: item.cod_consultor,
        placa: item.placa,
        associado: item.associado,
        valor: item.valor,
      },
      ano,
      mes
    )
    setExcluindo(false)
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Erro desconhecido.')
      return
    }
    onExcluido(item.cod_veiculo)
  }

  if (!confirmando) {
    return (
      <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => setConfirmando(true)}>
        Excluir
      </Botao>
    )
  }

  return (
    <div className="w-52 space-y-1.5">
      <p className="text-xs text-slate-500">Não descontar este rastreador da comissão?</p>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-1.5">
        <Botao type="button" variante="destaque" tamanho="sm" disabled={excluindo} onClick={confirmar}>
          {excluindo ? 'Excluindo…' : 'Confirmar'}
        </Botao>
        <Botao
          type="button"
          variante="fantasma"
          tamanho="sm"
          disabled={excluindo}
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </Botao>
      </div>
    </div>
  )
}

// Variante só do Gestor (com botão Excluir) da tabela de desconto de rastreadores — a versão
// compartilhada com o Consultor (TabelaRastreadores, em app/consultor/tabelas-listagem.tsx)
// continua sem essa ação, já que só o Gestor pode decidir não cobrar um rastreador.
export function TabelaRastreadoresGestor({
  linhas,
  ano,
  mes,
}: {
  linhas: DescontoRastreadorItem[]
  ano: number
  mes: number
}) {
  const [excluidos, setExcluidos] = useState<Set<number>>(new Set())
  const linhasVisiveis = linhas.filter((l) => !excluidos.has(l.cod_veiculo))

  const colunas: ColunaTabelaListagem<DescontoRastreadorItem>[] = [
    { chave: 'dt_contrato', titulo: 'Contrato', texto: (i) => formatarDataBr(i.dt_contrato), ordenar: (i) => i.dt_contrato },
    { chave: 'associado', titulo: 'Associado', texto: (i) => i.associado, ordenar: (i) => i.associado },
    { chave: 'placa', titulo: 'Placa', texto: (i) => i.placa, ordenar: (i) => i.placa },
    { chave: 'consultorNome', titulo: 'Consultor', texto: (i) => i.consultorNome, ordenar: (i) => i.consultorNome },
    {
      chave: 'valor',
      titulo: 'Valor a ser descontado',
      alinhar: 'right',
      texto: (i) => formatarMoeda(i.valor),
      ordenar: (i) => i.valor,
    },
    {
      chave: 'acoes',
      titulo: '',
      texto: () => '',
      render: (i) => (
        <AcaoExcluir
          item={i}
          ano={ano}
          mes={mes}
          onExcluido={(codVeiculo) => setExcluidos((atual) => new Set(atual).add(codVeiculo))}
        />
      ),
    },
  ]

  return (
    <TabelaListagem
      colunas={colunas}
      linhas={linhasVisiveis}
      textoVazio="Nenhum desconto de rastreador no período."
      larguraMinima={820}
      rodape={(linhasFiltradas) => (
        <tr className="border-t-2 border-brand-navy bg-slate-50 font-semibold">
          <td className="px-4 py-2" colSpan={4}>Total</td>
          <td className="px-4 py-2 text-right">
            {formatarMoeda(linhasFiltradas.reduce((soma, item) => soma + item.valor, 0))}
          </td>
          <td className="px-4 py-2" />
        </tr>
      )}
    />
  )
}
