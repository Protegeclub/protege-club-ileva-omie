import Link from 'next/link'
import type { ReactNode } from 'react'
import { Cartao } from './cartao'
import { IconeSeta } from './icones-sidebar'

// Atalho em formato de "módulo" (ícone grande + título + descrição + seta), em vez de um botão
// de texto solto — usado nos dois painéis (Gestor→consultor e Consultor) pra navegar pras
// sub-telas de Adesões/Recorrência/Descontos/Placas/Inadimplentes.
export function CardAtalho({
  href,
  icone,
  titulo,
  descricao,
}: {
  href: string
  icone: ReactNode
  titulo: string
  descricao: string
}) {
  return (
    <Link href={href} className="group block">
      <Cartao className="flex h-full items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy [&>svg]:h-5 [&>svg]:w-5">
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">{titulo}</p>
          <p className="mt-0.5 text-xs text-slate-400">{descricao}</p>
        </div>
        <IconeSeta className="mt-1.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-navy" />
      </Cartao>
    </Link>
  )
}
