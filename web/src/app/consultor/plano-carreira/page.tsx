import { calcularBonusNivel, calcularNivelGestao, NIVEIS_GESTAO, PATAMARES_BONUS_NIVEL } from '@/lib/apuracao/bonus-nivel'
import { LIMITE_PLACAS_BONUS_PERFORMANCE, VALOR_BONUS_PERFORMANCE_POR_PLACA } from '@/lib/apuracao/premiacao-individual'
import { Banner } from '@/lib/ui/banner'
import { Botao } from '@/lib/ui/botao'
import { CardMetrica } from '@/lib/ui/card-metrica'
import { Cartao, CartaoCabecalho } from '@/lib/ui/cartao'
import { IconeAlerta, IconePlaca, IconeTrofeu, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { carregarContextoConsultor } from '../dados'
import { formatarMoeda, NOMES_MESES } from '../tipos'
import { BarraProgressoMeta } from './barra-progresso-meta'
import { EscadaNiveis } from './escada-niveis'
import { GraficoBonusNivel } from './grafico-bonus-nivel'

// Página nova (pedido do Samuel, 10/08/2026): mostra o caminho do consultor no plano de carreira
// — patamares de placas ativadas no mês, o que já foi conquistado e o que falta pro próximo
// degrau — pra incentivar mais adesões e a cobrança de inadimplentes. Só lê e deriva o que já
// está calculado e salvo (mensal.ts/gerar.ts/bonus-nivel.ts/premiacao-individual.ts), nenhuma
// regra de negócio nova foi criada aqui.
export default async function PlanoCarreiraPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const contexto = await carregarContextoConsultor(params)

  if ('erro' in contexto) {
    return <Banner tom="aviso">{contexto.erro}</Banner>
  }

  const { ano, mes, linhaPropria, evolucao } = contexto

  if (!linhaPropria) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Plano de carreira</h1>
          <p className="mt-1 text-sm text-slate-500">
            Referência {NOMES_MESES[mes - 1]}/{ano}.
          </p>
        </div>
        <Cartao className="p-6 text-sm text-slate-500">
          Apuração ainda não gerada para este período. Peça ao Gestor para gerar.
        </Cartao>
      </div>
    )
  }

  const qtdPlacas = linhaPropria.detalhe?.placasAtivadas?.length ?? 0
  const inadimplentes = linhaPropria.detalhe?.inadimplentes ?? []
  const totalRecorrenciaEstimada = linhaPropria.detalhe?.totalRecorrenciaEstimadaInadimplentes ?? 0
  const nivelGestao = calcularNivelGestao(qtdPlacas)

  const patamarAtingido = calcularBonusNivel(qtdPlacas).patamarAtingido
  const patamarAtualBonus = PATAMARES_BONUS_NIVEL.find((p) => p.placas === patamarAtingido) ?? null
  const proximoPatamarBonus = PATAMARES_BONUS_NIVEL.find((p) => p.placas > qtdPlacas) ?? null
  const proximoNivelGestao = NIVEIS_GESTAO.find((n) => n.placas > qtdPlacas) ?? null

  const elegivelPremiacao = qtdPlacas >= LIMITE_PLACAS_BONUS_PERFORMANCE
  const faltamPremiacao = Math.max(0, LIMITE_PLACAS_BONUS_PERFORMANCE - qtdPlacas)
  const potencialMinimoPremiacao = LIMITE_PLACAS_BONUS_PERFORMANCE * VALOR_BONUS_PERFORMANCE_POR_PLACA

  const ganhosPlanoCarreira = linhaPropria.total_bonus_nivel + linhaPropria.total_premiacao_individual

  return (
    <div className="space-y-8">
      {/* Header — mesmo espírito do hero "Total a receber" do Dashboard, mas só com os 2
          componentes deste plano (bônus por patamar + premiação individual). */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-brand-navy">
            Plano de carreira
            {nivelGestao && (
              <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-brand-orange">
                {nivelGestao.titulo}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Referência {NOMES_MESES[mes - 1]}/{ano}.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Seus patamares de placas ativadas no mês — o que você já conquistou e o que está a um passo de conquistar.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-brand-navy p-5 text-white shadow-sm lg:w-96">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white [&>svg]:h-6 [&>svg]:w-6">
            <IconeTrofeu />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Ganhos do plano de carreira</p>
            <p className="text-2xl font-bold tabular-nums">{formatarMoeda(ganhosPlanoCarreira)}</p>
            <p className="text-xs text-white/50">Bônus por patamar + premiação individual este mês</p>
          </div>
        </div>
      </div>

      {/* Filtro de competência — mesmo padrão de gestor/gerar/page.tsx (form GET simples). Sem o
          toggle "Visualizar dados da equipe" do FiltrosToolbar padrão: os dois bônus deste plano
          são sempre individuais, não fazem sentido agregados por equipe. */}
      <Cartao className="flex flex-wrap items-end gap-3 p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="mes" className="block text-xs font-medium text-slate-500">
              Mês
            </label>
            <select
              id="mes"
              name="mes"
              defaultValue={mes}
              className="mt-1.5 h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            >
              {NOMES_MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ano" className="block text-xs font-medium text-slate-500">
              Ano
            </label>
            <input
              id="ano"
              name="ano"
              type="number"
              defaultValue={ano}
              className="mt-1.5 h-11 w-24 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <Botao type="submit" variante="primaria" className="h-11">
            Ver competência
          </Botao>
        </form>
      </Cartao>

      {/* Posição atual */}
      <h2 className="text-sm font-medium text-slate-400">Sua posição atual</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardMetrica
          icone={<IconePlaca />}
          cor="orange"
          titulo="Placas ativadas no mês"
          valor={String(qtdPlacas)}
          descricao="Base de todos os patamares abaixo"
        />
        <CardMetrica
          icone={<IconeTrofeu />}
          cor="navy"
          titulo="Bônus por patamar"
          valor={formatarMoeda(linhaPropria.total_bonus_nivel)}
          selo={patamarAtualBonus ? `${patamarAtualBonus.placas} placas` : undefined}
          descricao={patamarAtualBonus ? undefined : 'Ainda não atingiu o 1º patamar (25 placas)'}
        />
        <CardMetrica
          icone={<IconeTrofeu />}
          cor="violet"
          titulo="Premiação individual"
          valor={formatarMoeda(linhaPropria.total_premiacao_individual)}
          descricao={
            elegivelPremiacao ? `R$${VALOR_BONUS_PERFORMANCE_POR_PLACA} por placa neste mês` : `Faltam ${faltamPremiacao} placas para desbloquear`
          }
        />
      </div>

      {/* Níveis de gestão */}
      <Cartao className="p-5">
        <CartaoCabecalho
          icone={<IconeUsuarios />}
          titulo="Níveis de gestão"
          descricao="Seu título evolui com as placas ativadas no mês — reinicia a cada competência."
        />
        <div className="mt-4">
          <EscadaNiveis qtdPlacasAtivadas={qtdPlacas} />
        </div>
        {proximoNivelGestao ? (
          <p className="mt-3 text-xs text-slate-400">
            Faltam <span className="font-semibold text-slate-600">{proximoNivelGestao.placas - qtdPlacas} placas</span> para virar{' '}
            <span className="font-semibold text-brand-navy">{proximoNivelGestao.titulo}</span>.
          </p>
        ) : (
          <p className="mt-3 text-xs font-medium text-emerald-600">Nível máximo atingido neste mês — Gestor Master!</p>
        )}
      </Cartao>

      {/* Bônus por patamar + Premiação individual, lado a lado */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Cartao className="p-5">
          <CartaoCabecalho
            icone={<IconeTrofeu />}
            titulo="Bônus por patamar (R$)"
            descricao="Paga o valor do maior patamar de placas ativadas atingido no mês."
          />
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">{formatarMoeda(linhaPropria.total_bonus_nivel)}</p>
              {proximoPatamarBonus && (
                <p className="text-xs text-slate-400">
                  Próximo: <span className="font-semibold text-brand-navy">{formatarMoeda(proximoPatamarBonus.valor)}</span>
                </p>
              )}
            </div>
            <div className="mt-3">
              {proximoPatamarBonus ? (
                <BarraProgressoMeta
                  atual={qtdPlacas - (patamarAtualBonus?.placas ?? 0)}
                  meta={proximoPatamarBonus.placas - (patamarAtualBonus?.placas ?? 0)}
                  cor="#f19100"
                />
              ) : (
                <BarraProgressoMeta atual={1} meta={1} cor="#f19100" />
              )}
            </div>
            {proximoPatamarBonus ? (
              <p className="mt-2 text-xs text-slate-500">
                Ative mais <span className="font-semibold text-slate-700">{proximoPatamarBonus.placas - qtdPlacas} placas</span> este
                mês e o bônus sobe para{' '}
                <span className="font-semibold text-brand-navy">{formatarMoeda(proximoPatamarBonus.valor)}</span> (+
                {formatarMoeda(proximoPatamarBonus.valor - (patamarAtualBonus?.valor ?? 0))}).
              </p>
            ) : (
              <p className="mt-2 text-xs font-medium text-emerald-600">Patamar máximo atingido neste mês (720 placas)!</p>
            )}
          </div>
        </Cartao>

        <Cartao className="p-5">
          <CartaoCabecalho
            icone={<IconeTrofeu />}
            titulo="Premiação individual"
            descricao={`A partir de ${LIMITE_PLACAS_BONUS_PERFORMANCE} placas ativadas, todas rendem R$${VALOR_BONUS_PERFORMANCE_POR_PLACA} cada.`}
          />
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">{formatarMoeda(linhaPropria.total_premiacao_individual)}</p>
              {!elegivelPremiacao && (
                <p className="text-xs text-slate-400">
                  Meta: <span className="font-semibold text-brand-navy">{LIMITE_PLACAS_BONUS_PERFORMANCE} placas</span>
                </p>
              )}
            </div>
            <div className="mt-3">
              <BarraProgressoMeta atual={qtdPlacas} meta={LIMITE_PLACAS_BONUS_PERFORMANCE} cor="#7c3aed" />
            </div>
            {elegivelPremiacao ? (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                Desbloqueado! R${VALOR_BONUS_PERFORMANCE_POR_PLACA} × {qtdPlacas} placas ={' '}
                {formatarMoeda(linhaPropria.total_premiacao_individual)}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Ative mais <span className="font-semibold text-slate-700">{faltamPremiacao} placas</span> este mês para desbloquear
                R${VALOR_BONUS_PERFORMANCE_POR_PLACA} por placa em todas — no mínimo{' '}
                <span className="font-semibold text-brand-navy">{formatarMoeda(potencialMinimoPremiacao)}</span>.
              </p>
            )}
          </div>
        </Cartao>
      </div>

      {/* Evolução */}
      <h2 className="text-sm font-medium text-slate-400">Evolução</h2>
      <GraficoBonusNivel evolucao={evolucao} />

      {/* Oportunidade: reverter inadimplentes — reaproveita o mesmo valor já calculado e exibido
          em /consultor/inadimplentes (totalRecorrenciaEstimadaInadimplentes), só reenquadrado
          como incentivo de ganho em vez de alerta de cobrança. */}
      {inadimplentes.length > 0 && (
        <Cartao className="flex flex-wrap items-center gap-4 border-red-200 bg-red-50/60 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <IconeAlerta className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Você tem {inadimplentes.length} associado{inadimplentes.length > 1 ? 's' : ''} inadimplente
              {inadimplentes.length > 1 ? 's' : ''}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Se todos pagarem este mês, sua recorrência aumenta em{' '}
              <span className="font-semibold text-red-700">{formatarMoeda(totalRecorrenciaEstimada)}</span> — vale a pena cobrar.
            </p>
          </div>
          <Botao href="/consultor/inadimplentes" variante="destaque" className="h-10 shrink-0">
            Ver inadimplentes
          </Botao>
        </Cartao>
      )}
    </div>
  )
}
