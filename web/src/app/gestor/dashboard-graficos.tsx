'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Pie,
  PieChart,
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
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="nome"
                innerRadius={52}
                outerRadius={72}
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {itemAtivo?.nome ?? 'Total líquido'}
            </p>
            <p className="text-sm font-semibold text-slate-900">{formatarMoeda(itemAtivo?.valor ?? totalLiquido)}</p>
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
                <span className="text-sm text-slate-500">
                  {formatarMoeda(d.valor)} <span className="font-medium text-slate-700">· {pct}%</span>
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
      <div className="mt-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(CORES_AREA).map(([campo, cor]) => (
                <linearGradient key={campo} id={`gradiente-${campo}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
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
                strokeWidth={3}
                fill={`url(#gradiente-${campo})`}
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

// Base compartilhada dos dois gráficos de barra mensais abaixo — mesmos 6 pontos de
// dashboard-mes.ts:evolucao (já estendido com totalDescontoRastreador/qtdPlacasAtivadas), só
// muda a cor/campo/formatação. Não exportado: só existe pra não duplicar as duas variações.
function GraficoBarraMensal({
  titulo,
  valorAtual,
  evolucao,
  campo,
  cor,
  formatarTooltip,
  formatarRotulo,
}: {
  titulo: string
  valorAtual: string
  evolucao: DashboardMes['evolucao']
  campo: 'qtdPlacasAtivadas' | 'totalDescontoRastreador'
  cor: string
  formatarTooltip: (valor: number) => string
  formatarRotulo: (valor: number) => string
}) {
  // A métrica só passou a ser registrada a partir de um certo mês (o resto da história do
  // sistema é zero de verdade, não "sem dado") — corta os meses iniciais zerados pra não
  // desperdiçar a largura do gráfico com barras vazias. Se TODOS os meses forem zero, mantém a
  // janela cheia (não faz sentido cortar tudo).
  const inicio = evolucao.findIndex((p) => p[campo] > 0)
  const evolucaoExibida = inicio <= 0 ? evolucao : evolucao.slice(inicio)

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{valorAtual}</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={evolucaoExibida} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(valor) => [formatarTooltip(Number(valor)), '']} cursor={{ fill: '#f8fafc' }} {...ESTILO_TOOLTIP} />
            <Bar dataKey={campo} radius={[6, 6, 0, 0]} fill={cor} maxBarSize={48} animationDuration={500}>
              <LabelList
                dataKey={campo}
                position="top"
                formatter={(valor: unknown) => {
                  const numero = Number(valor)
                  return numero > 0 ? formatarRotulo(numero) : ''
                }}
                style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}

export function GraficoPlacasAtivadas({ evolucao, atual }: { evolucao: DashboardMes['evolucao']; atual: number }) {
  return (
    <GraficoBarraMensal
      titulo="Placas ativadas no mês"
      valorAtual={String(atual)}
      evolucao={evolucao}
      campo="qtdPlacasAtivadas"
      cor="#f19100"
      formatarTooltip={(valor) => `${valor} placa(s)`}
      formatarRotulo={(valor) => String(valor)}
    />
  )
}

export function GraficoDescontoRastreador({ evolucao, atual }: { evolucao: DashboardMes['evolucao']; atual: number }) {
  return (
    <GraficoBarraMensal
      titulo="Desconto rastreador no mês"
      valorAtual={formatarMoeda(atual)}
      evolucao={evolucao}
      campo="totalDescontoRastreador"
      cor="#002a54"
      formatarTooltip={formatarMoeda}
      formatarRotulo={formatarMoeda}
    />
  )
}
