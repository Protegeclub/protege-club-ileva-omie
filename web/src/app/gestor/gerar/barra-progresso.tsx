'use client'

// Barra segmentada: verde = concluído, vermelho = erro, o resto (cinza, com um brilho animado
// enquanto `emAndamento`) representa pendente + processando juntos — não dá pra saber o tempo
// restante de cada consultor individualmente (a variação é enorme, de <1s a 30+min), então a
// barra mostra progresso real (quantos já terminaram) em vez de fingir uma estimativa de tempo.
export function BarraProgresso({
  total,
  ok,
  erro,
  emAndamento,
}: {
  total: number
  ok: number
  erro: number
  emAndamento: boolean
}) {
  const pctOk = total > 0 ? (ok / total) * 100 : 0
  const pctErro = total > 0 ? (erro / total) * 100 : 0

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="flex h-full w-full">
        <div
          className="h-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${pctOk}%` }}
        />
        <div
          className="h-full bg-red-400 transition-all duration-700 ease-out"
          style={{ width: `${pctErro}%` }}
        />
        {emAndamento && <div className="h-full flex-1 animate-pulse bg-slate-300/70" />}
      </div>
    </div>
  )
}
