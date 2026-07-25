'use client'

import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Cartao } from '@/lib/ui/cartao'
import type { DashboardMes } from '@/lib/apuracao/dashboard-mes'

// Client Component isolado (única peça do dashboard que usa Recharts) — o resto da página
// (gestor/page.tsx) é Server Component puro. Next.js separa o JS por rota, então o bundle do
// Recharts só pesa em /gestor, sem afetar nenhuma outra página do sistema. Donuts finos
// (innerRadius grande) e linhas finas (strokeWidth 2, sem área preenchida) de propósito — pedido
// explícito de manter os gráficos "leves" visualmente, não só em bundle.
const CORES_STATUS = {
  gerado: '#10b981',
  pendente: '#f59e0b',
  processando: '#0ea5e9',
  erro: '#ef4444',
} as const

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function DonutStatus({ statusContagem }: { statusContagem: DashboardMes['statusContagem'] }) {
  const dados = [
    { nome: 'Gerado', valor: statusContagem.gerado, cor: CORES_STATUS.gerado },
    { nome: 'Pendente', valor: statusContagem.pendente, cor: CORES_STATUS.pendente },
    { nome: 'Processando', valor: statusContagem.processando, cor: CORES_STATUS.processando },
    { nome: 'Erro', valor: statusContagem.erro, cor: CORES_STATUS.erro },
  ].filter((d) => d.valor > 0)
  const total = dados.reduce((soma, d) => soma + d.valor, 0)

  return (
    <Cartao>
      <p className="text-sm font-medium text-slate-700">Status das apurações</p>
      <div className="relative mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={74} paddingAngle={3} stroke="none">
              {dados.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(valor) => [`${valor} consultor(es)`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-slate-900">{total}</p>
          <p className="text-xs text-slate-400">consultores</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {dados.map((d) => (
          <span key={d.nome} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.cor }} aria-hidden />
            {d.nome} ({d.valor})
          </span>
        ))}
      </div>
    </Cartao>
  )
}

export function DonutComposicao({
  totalAdesao,
  totalRecorrencia,
}: {
  totalAdesao: number
  totalRecorrencia: number
}) {
  const dados = [
    { nome: 'Adesão', valor: totalAdesao, cor: '#f19100' },
    { nome: 'Recorrência', valor: totalRecorrencia, cor: '#25a9e1' },
  ].filter((d) => d.valor > 0)
  const total = totalAdesao + totalRecorrencia

  return (
    <Cartao>
      <p className="text-sm font-medium text-slate-700">Composição do líquido</p>
      <div className="relative mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={74} paddingAngle={3} stroke="none">
              {dados.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-base font-semibold text-slate-900">{formatarMoeda(total)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {dados.map((d) => (
          <span key={d.nome} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.cor }} aria-hidden />
            {d.nome}
          </span>
        ))}
      </div>
    </Cartao>
  )
}

const ROTULOS_LINHA: Record<string, string> = {
  totalLiquido: 'Líquido',
  totalAdesao: 'Adesão',
}

export function LinhaEvolucao({ evolucao }: { evolucao: DashboardMes['evolucao'] }) {
  return (
    <Cartao className="p-5 lg:col-span-2">
      <p className="text-sm font-medium text-slate-700">Evolução — últimos 6 meses</p>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(valor, nome) => [formatarMoeda(Number(valor)), ROTULOS_LINHA[String(nome)] ?? String(nome)]}
            />
            <Legend
              formatter={(valor) => <span className="text-xs text-slate-500">{ROTULOS_LINHA[String(valor)] ?? String(valor)}</span>}
            />
            <Line type="monotone" dataKey="totalLiquido" stroke="#002a54" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="totalAdesao" stroke="#f19100" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Cartao>
  )
}
