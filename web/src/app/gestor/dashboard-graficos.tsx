'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Cartao } from '@/lib/ui/cartao'
import type { DashboardMes } from '@/lib/apuracao/dashboard-mes'

// Client Component isolado (única peça do dashboard que usa Recharts) — o resto da página
// (gestor/page.tsx) é Server Component puro. Next.js separa o JS por rota, então o bundle do
// Recharts só pesa em /gestor, sem afetar nenhuma outra página do sistema.

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// Estilo de tooltip compartilhado entre os 4 gráficos — cartão branco com sombra e borda leve, em
// vez do tooltip cinza padrão do Recharts.
const ESTILO_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid #f1f5f9',
    boxShadow: '0 10px 25px -8px rgba(15, 23, 42, 0.15)',
    padding: '8px 12px',
  },
  labelStyle: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  itemStyle: { fontSize: 13, fontWeight: 600 },
}

export function DonutComposicao({
  totalLiquido,
  totalAdesao,
  totalRecorrencia,
}: {
  totalLiquido: number
  totalAdesao: number
  totalRecorrencia: number
}) {
  const dados = [
    { nome: 'Adesão', valor: totalAdesao, cor: '#f19100' },
    { nome: 'Recorrência', valor: totalRecorrencia, cor: '#25a9e1' },
  ].filter((d) => d.valor > 0)
  const totalComposicao = totalAdesao + totalRecorrencia

  // Sem <Tooltip> de propósito: como o valor de cada fatia já fica sempre visível na legenda ao
  // lado, um tooltip flutuante só duplicava a informação — e, seguindo o cursor, acabava
  // aparecendo em cima do rótulo central (mesma caixa de 176px), com os dois textos sobrepostos
  // e ilegíveis. No lugar, o hover na fatia OU na linha da legenda troca o próprio rótulo
  // central pro valor daquele item — mesma informação, sem colisão possível.
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null)
  const itemAtivo = indiceAtivo != null ? dados[indiceAtivo] : null

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Composição do líquido</p>
      {/* Donut de 176px→144px e legenda em bloco empilhado (valor acima do %, em vez de tudo
          numa linha só com "·" no meio) — no card mais estreito da grade de 4 colunas, o texto
          "R$ 8.683 · 24%" não cabia numa linha e quebrava no meio da frase (pedido do Samuel,
          10/08/2026: "olha como está esse"). Empilhado, cada linha é curta o bastante pra nunca
          precisar quebrar, independente da largura do card. Furo do donut alargado (44/60 em vez
          de 40/56) + rótulo central sem tracking-wide/menor: no primeiro ajuste o furo ficou
          menor que o texto "TOTAL LÍQUIDO", que vazava por baixo do anel dos dois lados. */}
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="nome"
                innerRadius={44}
                outerRadius={60}
                paddingAngle={3}
                stroke="none"
                onMouseEnter={(_, i) => setIndiceAtivo(i)}
                onMouseLeave={() => setIndiceAtivo(null)}
              >
                {dados.map((d, i) => (
                  <Cell
                    key={d.nome}
                    fill={d.cor}
                    opacity={indiceAtivo === null || indiceAtivo === i ? 1 : 0.35}
                    className="transition-opacity duration-200"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
            <p className="text-[9px] font-medium uppercase text-slate-400">
              {itemAtivo?.nome ?? 'Total líquido'}
            </p>
            <p className="text-[13px] font-semibold text-slate-900">{formatarMoeda(itemAtivo?.valor ?? totalLiquido)}</p>
          </div>
        </div>
        <div className="w-full space-y-1">
          {dados.map((d, i) => {
            const pct = totalComposicao > 0 ? Math.round((d.valor / totalComposicao) * 100) : 0
            return (
              <div
                key={d.nome}
                onMouseEnter={() => setIndiceAtivo(i)}
                onMouseLeave={() => setIndiceAtivo(null)}
                className={`-mx-1.5 flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 transition-colors ${
                  indiceAtivo === i ? 'bg-slate-50' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.cor }} aria-hidden />
                  {d.nome}
                </span>
                <span className="flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-slate-700">{formatarMoeda(d.valor)}</span>
                  <span className="text-xs text-slate-400">{pct}%</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Cartao>
  )
}

const ROTULOS_AREA: Record<string, string> = {
  totalLiquido: 'Comissão líquida',
  totalAdesao: 'Adesão',
  totalRecorrencia: 'Recorrência',
}

const CORES_AREA: Record<string, string> = {
  totalLiquido: '#002a54',
  totalAdesao: '#f19100',
  totalRecorrencia: '#25a9e1',
}

export function AreaEvolucao({ evolucao }: { evolucao: DashboardMes['evolucao'] }) {
  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Evolução financeira — últimos 6 meses</p>
      {/* h-[350px] (~+20% sobre os 288px de antes) — é o gráfico principal do dashboard, pedido
          do Samuel (04/08/2026) pra dar mais destaque a ele. */}
      <div className="mt-2 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(CORES_AREA).map(([campo, cor]) => (
                <linearGradient key={campo} id={`gradiente-${campo}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cor} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              ))}
              {/* Sombra discreta sob a linha — só nas Area, não no grid/eixos. */}
              <filter id="sombra-linha" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
              </filter>
            </defs>
            {/* tickCount baixo (eixo já é hide, só afeta quantas linhas o grid desenha) — menos
                linhas horizontais, mais limpo. */}
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide tickCount={4} />
            <Tooltip
              formatter={(valor, nome) => [formatarMoeda(Number(valor)), ROTULOS_AREA[String(nome)] ?? String(nome)]}
              {...ESTILO_TOOLTIP}
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(valor) => <span className="text-xs text-slate-500">{ROTULOS_AREA[String(valor)] ?? String(valor)}</span>}
            />
            {Object.keys(CORES_AREA).map((campo) => (
              <Area
                key={campo}
                type="monotone"
                dataKey={campo}
                name={campo}
                stroke={CORES_AREA[campo]}
                strokeWidth={3.5}
                fill={`url(#gradiente-${campo})`}
                style={{ filter: 'url(#sombra-linha)' }}
                dot={{ r: 3, strokeWidth: 0, fill: CORES_AREA[campo] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}

// Os 3 cards de indicador (ver grid "Composição e indicadores" em page.tsx) dividem a largura
// com o donut de composição — 6 meses de barra+rótulo nesse espaço estreito colidem (rótulos de
// moeda se sobrepõem). Mostra só os últimos 4 dessa janela; o gráfico principal de Evolução
// (AreaEvolucao, sozinho na linha) continua mostrando os 6 meses completos.
const MESES_MINI_GRAFICO = 4

// A métrica só passou a ser registrada a partir de um certo mês (o resto da história do sistema
// é zero de verdade, não "sem dado") — corta os meses iniciais zerados pra não desperdiçar a
// largura do gráfico com barras/área vazias. Se TODOS os meses forem zero, mantém a janela
// cheia (não faz sentido cortar tudo). Compartilhado pelos 3 gráficos abaixo.
function recortarInicioZerado(
  evolucao: DashboardMes['evolucao'],
  campo: 'qtdPlacasAtivadas' | 'totalDescontoRastreador' | 'totalLiquido'
) {
  const inicio = evolucao.findIndex((p) => p[campo] > 0)
  const semZerosIniciais = inicio <= 0 ? evolucao : evolucao.slice(inicio)
  return semZerosIniciais.length <= MESES_MINI_GRAFICO
    ? semZerosIniciais
    : semZerosIniciais.slice(-MESES_MINI_GRAFICO)
}

// Barras mensais + linha de referência da média do período, com o mês atual destacado em laranja
// (os demais em navy translúcido) — substitui a antiga leitura só pelo texto grande acima do
// donut/área. Diferente dos outros dois gráficos desta página de propósito (pedido do Samuel,
// 10/08/2026: "gráficos melhores e diferentes"): aqui o ponto é comparar o mês atual contra a
// própria média histórica, não contra o mês anterior isolado.
export function GraficoTotalLiquido({ evolucao, atual }: { evolucao: DashboardMes['evolucao']; atual: number }) {
  const dados = recortarInicioZerado(evolucao, 'totalLiquido')
  const media = dados.length > 0 ? dados.reduce((soma, p) => soma + p.totalLiquido, 0) / dados.length : 0
  const rotuloAtual = dados[dados.length - 1]?.rotulo

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Total líquido no mês</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{formatarMoeda(atual)}</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), '']} cursor={{ fill: '#f8fafc' }} {...ESTILO_TOOLTIP} />
            <ReferenceLine y={media} stroke="#cbd5e1" strokeDasharray="4 4" />
            <Bar dataKey="totalLiquido" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={500}>
              {dados.map((p) => (
                <Cell key={p.rotulo} fill="#002a54" opacity={p.rotulo === rotuloAtual ? 1 : 0.3} />
              ))}
              <LabelList
                dataKey="totalLiquido"
                position="top"
                formatter={(valor: unknown) => {
                  const numero = Number(valor)
                  return numero > 0 ? formatarMoeda(numero) : ''
                }}
                style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Linha pontilhada: média do período exibido</p>
    </Cartao>
  )
}

// Combo barra (novas placas no mês) + linha (acumulado no período, eixo próprio oculto) — conta
// a história de crescimento, não só o valor isolado do mês. Diferente dos outros dois gráficos
// de propósito (ver comentário de GraficoTotalLiquido acima).
export function GraficoPlacasAtivadas({ evolucao, atual }: { evolucao: DashboardMes['evolucao']; atual: number }) {
  const base = recortarInicioZerado(evolucao, 'qtdPlacasAtivadas')
  const dados = base.reduce<(DashboardMes['evolucao'][number] & { acumulado: number })[]>((acc, p) => {
    const acumulado = (acc[acc.length - 1]?.acumulado ?? 0) + p.qtdPlacasAtivadas
    acc.push({ ...p, acumulado })
    return acc
  }, [])

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Placas ativadas no mês</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{atual}</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dados} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="qtd" hide />
            <YAxis yAxisId="acumulado" hide />
            <Tooltip
              formatter={(valor, nome) => [
                nome === 'acumulado' ? `${valor} no total` : `${valor} placa(s)`,
                nome === 'acumulado' ? 'Acumulado no período' : 'No mês',
              ]}
              {...ESTILO_TOOLTIP}
            />
            <Bar yAxisId="qtd" dataKey="qtdPlacasAtivadas" radius={[6, 6, 0, 0]} fill="#f19100" maxBarSize={40} animationDuration={500}>
              <LabelList
                dataKey="qtdPlacasAtivadas"
                position="top"
                formatter={(valor: unknown) => (Number(valor) > 0 ? String(valor) : '')}
                style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
            <Line
              yAxisId="acumulado"
              type="monotone"
              dataKey="acumulado"
              stroke="#002a54"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: '#002a54' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Barra: novas placas no mês · Linha: acumulado no período exibido</p>
    </Cartao>
  )
}

// Área preenchida com gradiente (em vez de barra) — leitura mais "custo acumulado" do que
// "evento discreto", coerente com o que a métrica representa (valor descontado dos consultores,
// não uma contagem). Diferente dos outros dois gráficos de propósito (ver comentário de
// GraficoTotalLiquido acima).
export function GraficoDescontoRastreador({ evolucao, atual }: { evolucao: DashboardMes['evolucao']; atual: number }) {
  const dados = recortarInicioZerado(evolucao, 'totalDescontoRastreador')

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Desconto rastreador no mês</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{formatarMoeda(atual)}</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradiente-desconto-rastreador" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#002a54" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#002a54" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), '']} {...ESTILO_TOOLTIP} />
            <Area
              type="monotone"
              dataKey="totalDescontoRastreador"
              stroke="#002a54"
              strokeWidth={2.5}
              fill="url(#gradiente-desconto-rastreador)"
              dot={{ r: 3, strokeWidth: 0, fill: '#002a54' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}
