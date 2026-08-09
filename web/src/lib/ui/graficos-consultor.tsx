'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PontoEvolucaoConsultor } from '@/app/consultor/tipos'
import { formatarMoeda } from '@/app/consultor/tipos'
import { Cartao } from './cartao'

// Client Component isolado (única peça do painel do Consultor que usa Recharts) — mesmo espírito
// de gestor/dashboard-graficos.tsx: tooltip premium compartilhado, gráficos leves.
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

export function AreaProducaoMensal({ evolucao }: { evolucao: PontoEvolucaoConsultor[] }) {
  return (
    <Cartao className="p-5 lg:col-span-2">
      <p className="text-sm font-medium text-slate-700">Produção mensal — últimos 6 meses</p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradiente-producao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#002a54" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#002a54" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), 'Líquido']} {...ESTILO_TOOLTIP} />
            <Area
              type="monotone"
              dataKey="totalLiquido"
              stroke="#002a54"
              strokeWidth={2.5}
              fill="url(#gradiente-producao)"
              dot={{ r: 3, strokeWidth: 0, fill: '#002a54' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}

export function DonutComposicaoConsultor({
  totalLiquido,
  totalAdesao,
  totalRecorrencia,
  totalDescontoRastreador,
}: {
  totalLiquido: number
  totalAdesao: number
  totalRecorrencia: number
  totalDescontoRastreador: number
}) {
  const dados = [
    { nome: 'Adesão', valor: totalAdesao, cor: '#f19100' },
    { nome: 'Recorrência', valor: totalRecorrencia, cor: '#25a9e1' },
    { nome: 'Descontos', valor: totalDescontoRastreador, cor: '#ef4444' },
  ].filter((d) => d.valor > 0)

  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">Composição da comissão</p>
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
          {dados.map((d) => (
            <div key={d.nome} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.cor }} aria-hidden />
                {d.nome}
              </span>
              <span className="text-sm font-medium text-slate-700">{formatarMoeda(d.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </Cartao>
  )
}

export function BarraAdesoesPorMes({ evolucao }: { evolucao: PontoEvolucaoConsultor[] }) {
  return (
    <Cartao className="p-5 lg:col-span-2">
      <p className="text-sm font-medium text-slate-700">Adesões por mês</p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide allowDecimals={false} />
            <Tooltip formatter={(valor) => [`${valor} adesões`, '']} cursor={{ fill: '#f8fafc' }} {...ESTILO_TOOLTIP} />
            <Bar dataKey="qtdAdesoes" fill="#f19100" radius={[6, 6, 0, 0]} barSize={28} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}
