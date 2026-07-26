import type { ReactNode } from 'react'

// Generaliza o padrão de card que hoje só existia (com rounded-xl) nos formulários de
// gestor/gerar — vira o padrão em todo o app, no lugar da mistura de rounded-md/rounded-lg
// usada sem critério antes.
export function Cartao({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className ?? 'p-5'}`}>
      {children}
    </div>
  )
}

// Header com ícone-tile + título + descrição — mesmo padrão visual do gerar-apuracao-form/
// gerar-lote-form originais, mas com tons da marca (azul claro/navy) no lugar do indigo/blue
// improvisados que existiam antes.
export function CartaoCabecalho({
  icone,
  titulo,
  descricao,
  tom = 'navy',
}: {
  icone: ReactNode
  titulo: string
  descricao?: string
  tom?: 'navy' | 'azul'
}) {
  const tonalidade = tom === 'navy' ? 'bg-brand-navy/10 text-brand-navy' : 'bg-sky-50 text-brand-blue'
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tonalidade}`}>
        {icone}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
        {descricao ? <p className="mt-0.5 text-xs text-slate-500">{descricao}</p> : null}
      </div>
    </div>
  )
}
