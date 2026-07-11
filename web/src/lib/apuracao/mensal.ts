import { buscarCobranca, listarCobrancasPorVeiculo, listarVeiculos } from '@/lib/ileva/api'
import { COD_BENEFICIO_ASSISTENCIA_PROFISSIONAL } from '@/types/domain'
import type { Veiculo } from '@/types/domain'

export interface AdesaoItem {
  cod_veiculo: number
  placa: string
  associado: string
  valor: number
  dt_pagamento: string | null
}

export interface RecorrenciaItem {
  cod_veiculo: number
  placa: string
  valor: number
  cod_cobranca: number
}

export interface VeiculoRastreadorItem {
  cod_veiculo: number
  placa: string
  associado: string
}

export interface ApuracaoConsultorMesDetalhada {
  cod_consultor: number
  ano: number
  mes: number
  totalAdesao: number
  totalRecorrencia: number
  adesoes: AdesaoItem[]
  recorrencias: RecorrenciaItem[]
  veiculosComRastreador: VeiculoRastreadorItem[]
}

function intervaloMes(ano: number, mes: number) {
  const de = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const ate = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  return { de, ate }
}

// A API do Ileva exige inicio_paginacao e não documenta um teto de quantidade_por_pagina — 200
// funcionou nos testes reais. Alguns consultores têm centenas de veículos (já vimos um com 871),
// então isso pagina de verdade em vez de assumir que cabe tudo numa página.
async function listarTodosVeiculosDoConsultor(codConsultor: number): Promise<Veiculo[]> {
  const tamanhoPagina = 200
  let inicio = 0
  const todos: Veiculo[] = []

  while (true) {
    const { total_encontrados, veiculos } = await listarVeiculos({
      cod_consultor: codConsultor,
      inicio_paginacao: inicio,
      quantidade_por_pagina: tamanhoPagina,
      mostrar_beneficios: 1,
    })
    todos.push(...veiculos)
    inicio += tamanhoPagina
    if (inicio >= total_encontrados || veiculos.length === 0) break
  }

  return todos
}

// Roda algumas requisições por vez em vez de todas de uma vez (consultores com muitos veículos
// derrubariam a API/timeout do servidor se disparássemos tudo em paralelo).
async function comConcorrenciaLimitada<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length)
  let indice = 0

  async function worker() {
    while (indice < itens.length) {
      const atual = indice++
      resultados[atual] = await fn(itens[atual])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker))
  return resultados
}

/**
 * Apura adesão e recorrência de um consultor num mês, direto na API do Ileva.
 *
 * ATENÇÃO: para consultores com muitos veículos isso é lento (uma chamada por veículo, mais uma
 * por boleto de Fechamento pago) — por isso essa função é pensada para ser chamada por uma ação
 * explícita ("gerar apuração", ver src/app/comercial) que salva o resultado em
 * `apuracoes_mensais`, não para ser chamada a cada carregamento de tela do consultor.
 *
 * Ainda não calcula: desconto de instalação de rastreador (não identificamos onde é lançado no
 * Ileva — ver CONTEXTO_E_CHECKLIST.md) nem plano de carreira (regras não definidas pelo cliente).
 */
export async function apurarConsultorMes(
  codConsultor: number,
  ano: number,
  mes: number
): Promise<ApuracaoConsultorMesDetalhada> {
  const { de, ate } = intervaloMes(ano, mes)

  const veiculos = await listarTodosVeiculosDoConsultor(codConsultor)

  const veiculosComRastreador: VeiculoRastreadorItem[] = veiculos
    .filter((v) => v.possui_rastreador === 'Sim')
    .map((v) => ({ cod_veiculo: v.cod_veiculo, placa: v.placa, associado: v.associado }))

  const adesoes: AdesaoItem[] = []
  const recorrencias: RecorrenciaItem[] = []

  await comConcorrenciaLimitada(veiculos, 5, async (veiculo) => {
    const { boletos } = await listarCobrancasPorVeiculo({
      cod_veiculo: veiculo.cod_veiculo,
      situacao_boleto: 'Liquidado',
      dt_pagamento_de: de,
      dt_pagamento_ate: ate,
      inicio_paginacao: 0,
      quantidade_por_pagina: 50,
    })

    for (const boleto of boletos) {
      if (boleto.tipo_boleto === 'Adesão') {
        adesoes.push({
          cod_veiculo: veiculo.cod_veiculo,
          placa: veiculo.placa,
          associado: veiculo.associado,
          valor: Number(boleto.valor_pagamento ?? boleto.valor_boleto),
          dt_pagamento: boleto.dt_pagamento,
        })
      } else if (boleto.tipo_boleto === 'Fechamento') {
        const { boleto: detalhe } = await buscarCobranca({ cod_cobranca: boleto.cod_cobranca })
        for (const veiculoDetalhe of detalhe.veiculos) {
          for (const lancamento of veiculoDetalhe.lancamentos) {
            if (
              lancamento.cod_beneficio &&
              (COD_BENEFICIO_ASSISTENCIA_PROFISSIONAL as readonly number[]).includes(
                lancamento.cod_beneficio
              )
            ) {
              recorrencias.push({
                cod_veiculo: veiculoDetalhe.cod_veiculo,
                placa: veiculoDetalhe.placa,
                valor: Number(lancamento.valor),
                cod_cobranca: boleto.cod_cobranca,
              })
            }
          }
        }
      }
    }
  })

  return {
    cod_consultor: codConsultor,
    ano,
    mes,
    totalAdesao: adesoes.reduce((soma, item) => soma + item.valor, 0),
    totalRecorrencia: recorrencias.reduce((soma, item) => soma + item.valor, 0),
    adesoes,
    recorrencias,
    veiculosComRastreador,
  }
}
