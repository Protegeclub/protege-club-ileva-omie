import type { ReactNode } from 'react'
import { Cartao } from './cartao'

export type CorAcentoCard = 'blue' | 'emerald' | 'violet' | 'orange' | 'navy'

// Cor de apoio discreta por card — só decorativo, não codifica nenhum significado além de
// diferenciar os cards visualmente (ver Consultores/Gerar/Dashboard, que compartilham este card).
const ACENTOS_CARD: Record<CorAcentoCard, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-orange-600',
  navy: 'bg-brand-navy/10 text-brand-navy',
}

// null = sem base de comparação (mês anterior zerado ou sem nenhuma apuração) — nesse caso o
// card não mostra tendência nenhuma, pra não inventar um "+100%"/"-100%" sem sentido.
export function calcularTendencia(atual: number, anterior: number): number | null {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

// Estilo "Stripe" — ícone circular colorido, rótulo em caixa alta ao lado, valor em destaque e,
// quando dá pra comparar com o mês anterior, uma linha de tendência (verde subindo / vermelho
// descendo); sem tendência, uma descrição curta no lugar (ex.: "Total de consultores"). Card de
// KPI compartilhado entre as telas de Consultores, Gerar apuração e Dashboard.
export function CardKpi({
  icone,
  titulo,
  valor,
  cor = 'navy',
  tendenciaPct,
  valorAnterior,
  descricao,
}: {
  icone: ReactNode
  titulo: string
  valor: string
  cor?: CorAcentoCard
  tendenciaPct?: number | null
  valorAnterior?: string
  descricao?: string
}) {
  const subiu = (tendenciaPct ?? 0) >= 0

  return (
    <Cartao className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4 ${ACENTOS_CARD[cor]}`}>
          {icone}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      </div>
      <p className="mt-3 text-xl font-semibold text-slate-900">{valor}</p>
      {tendenciaPct != null ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className={`inline-flex items-center gap-0.5 font-medium ${subiu ? 'text-emerald-600' : 'text-red-600'}`}>
            {subiu ? '▲' : '▼'} {subiu ? '+' : '-'}
            {Math.abs(Math.round(tendenciaPct))}%
          </span>
          {valorAnterior && <span className="text-slate-400">Mês anterior: {valorAnterior}</span>}
        </div>
      ) : descricao ? (
        <p className="mt-1.5 text-xs text-slate-400">{descricao}</p>
      ) : null}
    </Cartao>
  )
}
