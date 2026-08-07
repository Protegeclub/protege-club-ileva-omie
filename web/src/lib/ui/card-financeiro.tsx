import type { ReactNode } from 'react'
import type { PontoEvolucaoConsultor } from '@/app/consultor/tipos'
import { Cartao } from './cartao'
import { Sparkline } from './graficos-consultor'

// Card do "Resumo Financeiro" (Adesão/Recorrência/Desconto/Comissão líquida) — ícone + valor +
// cor específica + sparkline dos últimos 6 meses (mesmo dado já usado no gráfico de produção
// mensal, só recortado por campo).
export function CardFinanceiro({
  icone,
  titulo,
  valor,
  cor,
  corTexto,
  evolucao,
  campo,
  selo,
}: {
  icone: ReactNode
  titulo: string
  valor: string
  cor: string
  corTexto?: string
  evolucao: PontoEvolucaoConsultor[]
  campo: keyof PontoEvolucaoConsultor
  // Tag opcional ao lado do valor — hoje só usada no card de "Comissão do Plano de Carreira",
  // pra mostrar o nível de gestão (Líder Júnior, Coordenador etc.) junto do valor em R$.
  selo?: string
}) {
  return (
    <Cartao className="p-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4"
          style={{ background: `${cor}1a`, color: cor }}
        >
          {icone}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className={`text-xl font-semibold ${corTexto ?? 'text-slate-900'}`}>{valor}</p>
        {selo && (
          <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
            {selo}
          </span>
        )}
      </div>
      <div className="mt-1">
        <Sparkline evolucao={evolucao} campo={campo} cor={cor} />
      </div>
    </Cartao>
  )
}
