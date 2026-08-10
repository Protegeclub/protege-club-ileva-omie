// Barra de progresso rumo a uma meta real (patamar de placas do plano de carreira, ver
// lib/apuracao/bonus-nivel.ts e premiacao-individual.ts) — diferente do aviso em
// lib/ui/card-metrica.tsx ("nunca uma meta inventada, este sistema não tem meta cadastrada"): ali
// vale pra métricas sem meta de negócio nenhuma, mas aqui a meta é real, definida nas tabelas do
// plano de carreira, então "atual/meta" é uma informação legítima, não inventada.
export function BarraProgressoMeta({ atual, meta, cor }: { atual: number; meta: number; cor: string }) {
  const pct = meta > 0 ? Math.max(2, Math.min(100, Math.round((atual / meta) * 100))) : 100
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
    </div>
  )
}
