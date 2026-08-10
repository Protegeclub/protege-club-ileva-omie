'use client'

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PontoEvolucaoConsultor } from '@/app/consultor/tipos'
import { Cartao } from '@/lib/ui/cartao'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

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

// Últimos 4 meses (não os 6 completos de `evolucao`) — mesmo card estreito, mesma lição do
// dashboard do Gestor (10/08/2026): 6 rótulos de moeda colidem num card deste tamanho.
const MESES_EXIBIDOS = 4

export function GraficoBonusNivel({ evolucao }: { evolucao: PontoEvolucaoConsultor[] }) {
  const dados = evolucao.slice(-MESES_EXIBIDOS)
  const rotuloAtual = dados[dados.length - 1]?.rotulo

  return (
    <Cartao className="p-5 transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-700">Bônus por patamar — últimos meses</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(valor) => [formatarMoeda(Number(valor)), '']} cursor={{ fill: '#f8fafc' }} {...ESTILO_TOOLTIP} />
            <Bar dataKey="totalBonusNivel" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={500}>
              {dados.map((p) => (
                <Cell key={p.rotulo} fill="#002a54" opacity={p.rotulo === rotuloAtual ? 1 : 0.3} />
              ))}
              <LabelList
                dataKey="totalBonusNivel"
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
    </Cartao>
  )
}
