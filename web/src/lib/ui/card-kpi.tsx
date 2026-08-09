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

// Mesma cor de cada acento, em hex — usado no traço do sparkline/anel (SVG não lê classes do
// Tailwind, precisa do valor literal).
const ACENTOS_HEX: Record<CorAcentoCard, string> = {
  blue: '#2563eb',
  emerald: '#059669',
  violet: '#7c3aed',
  orange: '#f19100',
  navy: '#002a54',
}

// null = sem base de comparação (mês anterior zerado ou sem nenhuma apuração) — nesse caso o
// card não mostra tendência nenhuma, pra não inventar um "+100%"/"-100%" sem sentido.
export function calcularTendencia(atual: number, anterior: number): number | null {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

// Pra BarraProgresso do CardKpi: proporção do mês atual sobre (atual + anterior) — mesma
// comparação que calcularTendencia já expressa como seta, só que como barra. Nunca uma
// meta/quota (este sistema não tem nenhuma cadastrada) — null quando não há base real.
export function calcularProgresso(atual: number, anterior: number): number | null {
  const total = atual + anterior
  if (!total) return null
  return Math.max(4, Math.min(100, Math.round((atual / total) * 100)))
}

// Mini gráfico de linha 100% SVG estático (sem Recharts/client) — só desenha a forma, os
// valores continuam vindo prontos de quem chama (ex.: dashboard-mes.ts:evolucao). Precisa de
// pelo menos 2 pontos pra ter uma linha.
function Sparkline({ dados, cor }: { dados: number[]; cor: string }) {
  const largura = 100
  const altura = 28
  const min = Math.min(...dados)
  const max = Math.max(...dados)
  const amplitude = max - min || 1
  const passo = largura / (dados.length - 1)
  const linha = dados.map((v, i) => `${i * passo},${altura - ((v - min) / amplitude) * altura}`).join(' ')
  const area = `0,${altura} ${linha} ${largura},${altura}`

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" aria-hidden="true" className="mt-2.5 h-7 w-full">
      <polyline points={area} fill={cor} opacity={0.12} stroke="none" />
      <polyline points={linha} fill="none" stroke={cor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Anel de progresso (ex.: "191 de 192 apurados") — alternativa ao sparkline pra KPI que é uma
// proporção, não uma série no tempo.
function AnelProgresso({ atual, total, cor }: { atual: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0
  const raio = 12
  const circunferencia = 2 * Math.PI * raio

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <svg viewBox="0 0 28 28" aria-hidden="true" className="h-6 w-6 shrink-0 -rotate-90">
        <circle cx="14" cy="14" r={raio} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
        <circle
          cx="14"
          cy="14"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia - (pct / 100) * circunferencia}
        />
      </svg>
      <span className="text-xs font-medium text-slate-400">{pct}% apurado</span>
    </div>
  )
}

// Barrinha de 3px no rodapé do card — só pros KPIs que têm um "mês anterior" real pra comparar
// (líquido/adesão/recorrência). Mostra a proporção do mês atual sobre (atual + anterior) — é só
// outra forma visual da mesma tendência que a seta já mostra, nunca uma meta/quota inventada
// (este sistema não tem meta cadastrada em lugar nenhum, ver dashboard-mes.ts).
function BarraProgresso({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
    </div>
  )
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
  sparkline,
  anelProgresso,
  progresso,
  destaque = false,
}: {
  icone: ReactNode
  titulo: string
  valor: string
  cor?: CorAcentoCard
  tendenciaPct?: number | null
  valorAnterior?: string
  descricao?: string
  /** Série de valores já existentes (ex.: evolução de 6 meses) — opcional, sem uso hoje fora do Dashboard. */
  sparkline?: number[]
  /** Alternativa ao sparkline pra KPI de proporção (ex.: consultores apurados/ativos). */
  anelProgresso?: { atual: number; total: number }
  /** 0-100 já calculado por quem chama (ex.: atual/(atual+anterior)) — nunca uma meta inventada. */
  progresso?: number
  /** KPI "hero" da tela (ex.: Comissão líquida no Dashboard) — maior, com mais peso visual. */
  destaque?: boolean
}) {
  const subiu = (tendenciaPct ?? 0) >= 0
  const corHex = ACENTOS_HEX[cor]

  return (
    <Cartao className={`transition-shadow hover:shadow-md ${destaque ? 'p-5' : 'p-4'}`}>
      <div className="flex items-center gap-2.5">
        <div
          className={`flex shrink-0 items-center justify-center rounded-full ${
            destaque ? 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5' : 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4'
          } ${ACENTOS_CARD[cor]}`}
        >
          {icone}
        </div>
        <p className={`font-semibold uppercase tracking-wide text-slate-400 ${destaque ? 'text-xs' : 'text-[11px]'}`}>{titulo}</p>
      </div>
      <p className={`mt-3 font-semibold tabular-nums text-slate-900 ${destaque ? 'text-3xl' : 'text-xl'}`}>{valor}</p>
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
      {sparkline && sparkline.length >= 2 ? <Sparkline dados={sparkline} cor={corHex} /> : null}
      {anelProgresso ? <AnelProgresso {...anelProgresso} cor={corHex} /> : null}
      {progresso != null ? <BarraProgresso pct={progresso} cor={corHex} /> : null}
    </Cartao>
  )
}
