import { buscarCobranca, buscarConsultorSemCache, listarCobrancasPorVeiculo, listarVeiculos } from '@/lib/ileva/api'
import { COD_BENEFICIO_ASSISTENCIA_PROFISSIONAL, VALOR_DESCONTO_RASTREADOR } from '@/types/domain'
import type { Veiculo } from '@/types/domain'

export interface AdesaoItem {
  cod_veiculo: number
  placa: string
  associado: string
  consultorNome: string
  valor: number
  dt_pagamento: string | null
  cod_cobranca: number
  referencia: string | null
}

// `dt_pagamento` foi adicionado depois das primeiras gerações de teste — apurações antigas
// salvas antes disso podem ter esse campo ausente. O relatório por intervalo de datas
// (lib/relatorios) trata isso como "sem data conhecida" e avisa em vez de inventar uma.
export interface RecorrenciaItem {
  cod_veiculo: number
  placa: string
  associado: string
  consultorNome: string
  valor: number
  cod_cobranca: number
  dt_pagamento: string | null
  // Mês/ano de referência da mensalidade (formato "AAAA-MM", ex.: "2026-05") — só pra controle
  // visual (mostra qual mês o boleto cobre, já que a contagem em si é sempre pela data de
  // pagamento, nunca pela referência: um cliente com boletos atrasados pode pagar vários meses
  // de referência diferentes no mesmo mês, e cada um conta como uma linha própria).
  referencia: string | null
}

export interface VeiculoRastreadorItem {
  cod_veiculo: number
  placa: string
  associado: string
}

// Hipótese confirmada pelos prints do Power BI atual: R$100 fixo por veículo com rastreador,
// descontado no mês em que o contrato (`dt_contrato`) foi assinado — não é recorrente.
export interface DescontoRastreadorItem {
  cod_veiculo: number
  placa: string
  associado: string
  consultorNome: string
  // De quem é a apuração (não só o nome) — necessário pra saber qual apuração atualizar ao
  // excluir manualmente um desconto (ver gestor/consultor/[cod]/rastreadores), mesmo quando a
  // lista exibida junta vários consultores (toggle "ver equipe").
  cod_consultor: number
  dt_contrato: string
  valor: number
}

// Veículo cujo contrato (dt_contrato) começou no mês apurado — métrica operacional de "ativação"
// (o painel "Consultores com Mais Ativações" do próprio Ileva), diferente da adesão financeira
// (que só conta quando o boleto é pago, ver AdesaoItem acima — confirmado com o cliente em
// 13/07/2026 que a comissão é mesmo pelo pagamento, não pela ativação; esta aba existe só como
// visão operacional complementar, não entra em nenhum total de comissão).
export interface PlacaAtivadaItem {
  cod_veiculo: number
  placa: string
  associado: string
  consultorNome: string
  dt_contrato: string
}

export interface InadimplenteItem {
  cod_veiculo: number
  placa: string
  associado: string
  telefone: string
  consultorNome: string
  dt_vencimento: string
  valorBoleto: number
  valorRecorrenciaEstimado: number
  cod_cobranca: number
  referencia: string | null
}

export interface ApuracaoConsultorMesDetalhada {
  cod_consultor: number
  nomeConsultor: string
  codEquipe: number
  ano: number
  mes: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
  adesoes: AdesaoItem[]
  recorrencias: RecorrenciaItem[]
  veiculosComRastreador: VeiculoRastreadorItem[]
  descontosRastreador: DescontoRastreadorItem[]
  placasAtivadas: PlacaAtivadaItem[]
  inadimplentes: InadimplenteItem[]
  totalRecorrenciaEstimadaInadimplentes: number
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

function valorBeneficioAssistenciaProfissional(veiculo: Veiculo): number {
  const beneficio = (veiculo.beneficios ?? []).find((b) =>
    (COD_BENEFICIO_ASSISTENCIA_PROFISSIONAL as readonly number[]).includes(b.cod_beneficio)
  )
  return beneficio ? Number(beneficio.beneficio_valor) : 0
}

// O campo `possui_rastreador` do veículo só reflete o "Rastreamento Obrigatório" (cod_beneficio
// 68, incluído no plano) — um veículo com o rastreamento comercial avulso (cod_beneficio 18,
// adicional pago) vem com `possui_rastreador: "Não"` mesmo tendo rastreador de verdade. Confirmado
// com dado real (consultor #9, placas RVC2H97/PXT6B78, 13-14/07/2026) contra o filtro de
// "Benefícios: Rastreamento*" do próprio painel do Ileva, que agrupa todas as variantes
// (Rastreamento, Rastreamento Obrigatório, Rastreamento - Planos, Rastreamento - Plano Partner,
// Rastreamento Obrigatório Motorista de aplicativo) como a mesma coisa. Checar pelo nome do
// benefício em vez do campo cobre todas essas variantes sem precisar cadastrar cada código.
function temBeneficioRastreador(veiculo: Veiculo): boolean {
  return (veiculo.beneficios ?? []).some((b) => b.beneficio_nome.toLowerCase().includes('rastreamento'))
}

/**
 * Apura adesão, recorrência, desconto de rastreador e inadimplência de um consultor num mês,
 * direto na API do Ileva.
 *
 * ATENÇÃO: para consultores com muitos veículos isso é lento (uma chamada por veículo, mais uma
 * por boleto de Fechamento pago) — por isso essa função é pensada para ser chamada por uma ação
 * explícita ("gerar apuração", ver src/app/gestor/gerar) que salva o resultado em
 * `apuracoes_mensais`, não para ser chamada a cada carregamento de tela do consultor.
 *
 * Não calcula premiação aqui — o Bônus por Performance (individual) é derivado do
 * `adesoes.length` deste resultado em gerar.ts (ver premiacao-individual.ts). "Premiação de
 * equipe" e "níveis" do plano de carreira continuam sem regra definida pelo cliente (ver
 * CONTEXTO_E_CHECKLIST.md).
 */
export async function apurarConsultorMes(
  codConsultor: number,
  ano: number,
  mes: number
): Promise<ApuracaoConsultorMesDetalhada> {
  const { de, ate } = intervaloMes(ano, mes)
  const hoje = new Date().toISOString().slice(0, 10)

  // SEMPRE a versão sem cache aqui: nome/cod_equipe são persistidos em apuracoes_mensais (ver
  // gerar.ts) — um cache de 60s poderia gravar a equipe errada no mês apurado se o consultor
  // tivesse acabado de trocar de equipe. Apuração é uma ação deliberada e já demorada (minutos
  // pros consultores maiores), então não há ganho real de performance em cachear isso aqui.
  const [{ consultor }, veiculos] = await Promise.all([
    buscarConsultorSemCache({ cod_consultor: codConsultor }),
    listarTodosVeiculosDoConsultor(codConsultor),
  ])
  const nomeConsultor = consultor.nome
  const codEquipe = consultor.cod_equipe

  const veiculosComRastreador: VeiculoRastreadorItem[] = veiculos
    .filter(temBeneficioRastreador)
    .map((v) => ({ cod_veiculo: v.cod_veiculo, placa: v.placa, associado: v.associado }))

  const descontosRastreador: DescontoRastreadorItem[] = veiculos
    .filter((v) => temBeneficioRastreador(v) && v.dt_contrato >= de && v.dt_contrato <= ate)
    .map((v) => ({
      cod_veiculo: v.cod_veiculo,
      placa: v.placa,
      associado: v.associado,
      consultorNome: nomeConsultor,
      cod_consultor: codConsultor,
      dt_contrato: v.dt_contrato,
      valor: VALOR_DESCONTO_RASTREADOR,
    }))

  // Não precisa de chamada extra à API — já temos todos os veículos do consultor em memória.
  const placasAtivadas: PlacaAtivadaItem[] = veiculos
    .filter((v) => v.dt_contrato >= de && v.dt_contrato <= ate)
    .map((v) => ({
      cod_veiculo: v.cod_veiculo,
      placa: v.placa,
      associado: v.associado,
      consultorNome: nomeConsultor,
      dt_contrato: v.dt_contrato,
    }))
    .sort((a, b) => a.dt_contrato.localeCompare(b.dt_contrato))

  // Antes só pegava o vencimento mais antigo em aberto por veículo — se tivesse 3 mensalidades
  // atrasadas empilhadas, mostrava só 1 e escondia as outras 2 (e o valor estimado de
  // recorrência também ficava subestimado, já que cada mês em aberto é uma recorrência a mais
  // que o consultor recuperaria se o associado pagasse). Agora lista todos.
  const inadimplentesPorVeiculo = await comConcorrenciaLimitada(veiculos, 5, async (veiculo) => {
    const { boletos } = await listarCobrancasPorVeiculo({
      cod_veiculo: veiculo.cod_veiculo,
      situacao_boleto: 'Aberto',
      dt_vencimento_ate: hoje,
      inicio_paginacao: 0,
      quantidade_por_pagina: 30,
    })
    const valorRecorrenciaEstimado = valorBeneficioAssistenciaProfissional(veiculo)
    return boletos.map(
      (boleto): InadimplenteItem => ({
        cod_veiculo: veiculo.cod_veiculo,
        placa: veiculo.placa,
        associado: veiculo.associado,
        telefone: veiculo.tel_celular || veiculo.tel_fixo || '',
        consultorNome: nomeConsultor,
        dt_vencimento: boleto.dt_vencimento,
        valorBoleto: Number(boleto.valor_boleto),
        valorRecorrenciaEstimado,
        cod_cobranca: boleto.cod_cobranca,
        referencia: boleto.referencia ?? null,
      })
    )
  })
  const inadimplentes = inadimplentesPorVeiculo
    .flat()
    .sort((a, b) => a.dt_vencimento.localeCompare(b.dt_vencimento))

  const adesoes: AdesaoItem[] = []
  const recorrencias: RecorrenciaItem[] = []
  const veiculoPorCodigo = new Map(veiculos.map((v) => [v.cod_veiculo, v]))

  // Um boleto de Fechamento pode cobrir várias placas do mesmo associado num só boleto (comum em
  // contas com frota/família) — ele aparece na listagem de cobranças de TODAS essas placas, não
  // só de uma. Sem essa checagem, `comConcorrenciaLimitada` processava (e contava) o mesmo boleto
  // uma vez para cada placa associada a ele, multiplicando a recorrência real por N (bug real
  // encontrado em 07/08/2026: um boleto com 7 placas virou 7×7=49 lançamentos salvos em vez de 7,
  // inflando a comissão). Cada `cod_cobranca` de Fechamento só pode ser processado uma vez.
  const cobrancasFechamentoProcessadas = new Set<number>()

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
          consultorNome: nomeConsultor,
          valor: Number(boleto.valor_pagamento ?? boleto.valor_boleto),
          dt_pagamento: boleto.dt_pagamento,
          cod_cobranca: boleto.cod_cobranca,
          referencia: boleto.referencia ?? null,
        })
      } else if (boleto.tipo_boleto === 'Fechamento') {
        if (cobrancasFechamentoProcessadas.has(boleto.cod_cobranca)) continue
        cobrancasFechamentoProcessadas.add(boleto.cod_cobranca)

        const { boleto: detalhe } = await buscarCobranca({ cod_cobranca: boleto.cod_cobranca })
        for (const veiculoDetalhe of detalhe.veiculos) {
          // Um boleto de Fechamento pode agrupar placas de MAIS de um consultor (ex.: família com
          // veículos vendidos por consultores diferentes, faturados juntos) — sem essa checagem,
          // a recorrência da placa do outro consultor era creditada aqui também, duplicando o
          // pagamento real (bug real encontrado em 07/08/2026, comparando com relatório do Ileva:
          // consultor #9 recebia R$62 de 2 placas que eram na verdade dos consultores #78 e #8).
          if (!veiculoPorCodigo.has(veiculoDetalhe.cod_veiculo)) continue
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
                associado: veiculoPorCodigo.get(veiculoDetalhe.cod_veiculo)!.associado,
                consultorNome: nomeConsultor,
                valor: Number(lancamento.valor),
                cod_cobranca: boleto.cod_cobranca,
                dt_pagamento: boleto.dt_pagamento,
                referencia: detalhe.referencia ?? null,
              })
            }
          }
        }
      }
    }
  })

  return {
    cod_consultor: codConsultor,
    nomeConsultor,
    codEquipe,
    ano,
    mes,
    totalAdesao: adesoes.reduce((soma, item) => soma + item.valor, 0),
    totalRecorrencia: recorrencias.reduce((soma, item) => soma + item.valor, 0),
    totalDescontoRastreador: descontosRastreador.reduce((soma, item) => soma + item.valor, 0),
    adesoes,
    recorrencias,
    veiculosComRastreador,
    descontosRastreador,
    placasAtivadas,
    inadimplentes,
    totalRecorrenciaEstimadaInadimplentes: inadimplentes.reduce(
      (soma, item) => soma + item.valorRecorrenciaEstimado,
      0
    ),
  }
}
