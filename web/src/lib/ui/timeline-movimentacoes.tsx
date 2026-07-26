import type { ItemTimeline, TipoMovimentacao } from '@/app/consultor/tipos'
import { formatarMoeda } from '@/app/consultor/tipos'
import { Cartao } from './cartao'
import { IconeAdesao, IconeAlerta, IconePlaca, IconeRecorrencia } from './icones-sidebar'

const CONFIG_TIPO: Record<TipoMovimentacao, { classes: string; Icone: typeof IconeAdesao }> = {
  adesao: { classes: 'bg-emerald-50 text-emerald-600', Icone: IconeAdesao },
  recorrencia: { classes: 'bg-blue-50 text-blue-600', Icone: IconeRecorrencia },
  desconto: { classes: 'bg-red-50 text-red-600', Icone: IconeAlerta },
  placa: { classes: 'bg-orange-50 text-orange-600', Icone: IconePlaca },
}

function formatarData(iso: string) {
  const data = new Date(`${iso}T00:00:00`)
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Timeline de movimentações — só reapresenta cronologicamente o que já está em
// detalhe.adesoes/recorrencias/descontosRastreador/placasAtivadas (ver montarTimeline em
// consultor/tipos.ts), sem somar nem calcular nada novo.
export function TimelineMovimentacoes({ itens }: { itens: ItemTimeline[] }) {
  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">Últimas movimentações</p>
      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhuma movimentação registrada neste período.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {itens.map((item, i) => {
            const { classes, Icone } = CONFIG_TIPO[item.tipo]
            return (
              <div key={`${item.tipo}-${item.data}-${i}`} className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${classes}`}>
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{item.titulo}</p>
                    <span className="shrink-0 text-xs text-slate-400">{formatarData(item.data)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{item.descricao}</p>
                  {item.valor > 0 && (
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{formatarMoeda(item.valor)}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Cartao>
  )
}
