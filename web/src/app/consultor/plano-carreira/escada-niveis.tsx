import { NIVEIS_GESTAO } from '@/lib/apuracao/bonus-nivel'
import { IconeApurado, IconeCadeado } from '@/lib/ui/icones-sidebar'

// Escada visual dos 8 níveis de gestão (só título/tag, sem valor em R$ — escala independente do
// bônus por patamar, ver bonus-nivel.ts) — mesma sequência da página 4 do PDF "Plano de Carreira
// Protegeclub". Rolagem horizontal em telas estreitas em vez de espremer os 8 degraus (mesma
// lição do squish corrigido no dashboard do Gestor, 10/08/2026: mais itens do que a largura do
// card comporta vira rótulo colado/cortado, não vira "menor").
export function EscadaNiveis({ qtdPlacasAtivadas }: { qtdPlacasAtivadas: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 pb-1">
        {NIVEIS_GESTAO.map((nivel, i) => {
          const atingido = qtdPlacasAtivadas >= nivel.placas
          const proximo = NIVEIS_GESTAO[i + 1]
          const ehAtual = atingido && (!proximo || qtdPlacasAtivadas < proximo.placas)
          return (
            <div
              key={nivel.titulo}
              className={`flex w-[118px] shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-3 ${
                ehAtual ? 'bg-brand-orange/10' : ''
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  ehAtual
                    ? 'bg-brand-orange text-white shadow-sm'
                    : atingido
                      ? 'bg-brand-navy/10 text-brand-navy'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {atingido ? <IconeApurado className="h-5 w-5" /> : <IconeCadeado className="h-4 w-4" />}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-semibold ${
                    ehAtual ? 'text-brand-orange' : atingido ? 'text-brand-navy' : 'text-slate-400'
                  }`}
                >
                  {nivel.titulo}
                </p>
                <p className="text-[11px] text-slate-400">{nivel.placas} placas</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
