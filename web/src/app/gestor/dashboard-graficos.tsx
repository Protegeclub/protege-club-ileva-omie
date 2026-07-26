'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Cartao } from '@/lib/ui/cartao'
import type { DashboardMes } from '@/lib/apuracao/dashboard-mes'
import { IconeCheckCircle, IconeRelogio, IconeSpinner, IconeXCircle } from './gerar/icones'

// Client Component isolado (única peça do dashboard que usa Recharts) — o resto da página
// (gestor/page.tsx) é Server Component puro. Next.js separa o JS por rota, então o bundle do
// Recharts só pesa em /gestor, sem afetar nenhuma outra página do sistema.
const CORES_STATUS = {
  // Mesmo laranja da marca usado no badge "Gerado" de TabelaGestor.tsx/gerar-lote-form.tsx —
  // mantém a mesma cor pro mesmo status em qualquer lugar do app.
  gerado: '#f19100',
  pendente: '#f59e0b',
  processando: '#0ea5e9',
  erro: '#ef4444',
} as const

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

export function DonutStatus({ statusContagem }: { statusContagem: DashboardMes['statusContagem'] }) {
  const dados = [
    { nome: 'Gerado', valor: statusContagem.gerado, cor: CORES_STATUS.gerado, classes: 'bg-brand-orange/10 text-brand-orange-hover', Icone: IconeCheckCircle },
    { nome: 'Pendente', valor: statusContagem.pendente, cor: CORES_STATUS.pendente, classes: 'bg-amber-50 text-amber-700', Icone: IconeRelogio },
    { nome: 'Processando', valor: statusContagem.processando, cor: CORES_STATUS.processando, classes: 'bg-sky-50 text-sky-700', Icone: IconeSpinner },
    { nome: 'Erro', valor: statusContagem.erro, cor: CORES_STATUS.erro, classes: 'bg-red-50 text-red-700', Icone: IconeXCircle },
  ].filter((d) => d.valor > 0)
  const total = dados.reduce((soma, d) => soma + d.valor, 0)

  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">Status das apurações</p>
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
                {dados.map((d) => (
                  <Cell key={d.nome} fill={d.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(valor) => [`${valor} consultor(es)`, '']} {...ESTILO_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold text-slate-900">{total}</p>
            <p className="text-xs text-slate-400">consultores</p>
          </div>
        </div>
        <div className="w-full space-y-2.5">
          {dados.map((d) => {
            const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0
            return (
              <div key={d.nome} className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${d.classes}`}>
                  <d.Icone className="h-3 w-3" />
                  {d.nome}
                </span>
                <span className="text-sm text-slate-500">
                  {d.valor} <span className="font-medium text-slate-700">· {pct}%</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Cartao>
  )
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

  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">Composição do líquido</p>
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
                {dados.map((d) => (
                  <Cell key={d.nome} fill={d.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), '']} {...ESTILO_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Total líquido</p>
            <p className="text-sm font-semibold text-slate-900">{formatarMoeda(totalLiquido)}</p>
          </div>
        </div>
        <div className="w-full space-y-2.5">
          {dados.map((d) => {
            const pct = totalComposicao > 0 ? Math.round((d.valor / totalComposicao) * 100) : 0
            return (
              <div key={d.nome} className="flex items-center justify-between gap-2">
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
    <Cartao className="p-5 lg:col-span-2">
      <p className="text-sm font-medium text-slate-700">Evolução — últimos 6 meses</p>
      <div className="mt-2 h-64">
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
                strokeWidth={2.5}
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

export function BarraEquipes({ rankingEquipes }: { rankingEquipes: DashboardMes['rankingEquipes'] }) {
  return (
    <Cartao className="p-5 lg:col-span-2">
      <p className="text-sm font-medium text-slate-700">Top equipes — adesões no mês</p>
      <div className="mt-2" style={{ height: Math.max(220, rankingEquipes.length * 34) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankingEquipes} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="equipe" width={150} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(valor) => [`${valor} adesões`, '']} cursor={{ fill: '#f8fafc' }} {...ESTILO_TOOLTIP} />
            <Bar dataKey="qtdAdesoes" fill="#002a54" radius={[0, 6, 6, 0]} barSize={16} animationDuration={600}>
              <LabelList dataKey="qtdAdesoes" position="right" style={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}
