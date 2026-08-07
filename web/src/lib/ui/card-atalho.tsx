import Link from 'next/link'
import type { ReactNode } from 'react'
import { IconeSeta } from './icones-sidebar'

// Atalho em formato de "módulo" (ícone grande + título + descrição + seta), em vez de um botão
// de texto solto — usado nos dois painéis (Gestor→consultor e Consultor) pra navegar pras
// sub-telas de Adesões/Recorrência/Descontos/Placas/Inadimplentes. Fundo navy + selo branco
// sólido com ícone no mesmo navy do card (a pedido do Samuel, 07/08/2026, pra destacar do resto
// da tela, que ficava muito branco) — não
// usa o `Cartao` compartilhado porque ele fixa fundo branco; segue o mesmo padrão do bloco
// "Total a receber" do dashboard, que também é navy sem passar pelo `Cartao`.
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
      <div className="flex h-full items-start gap-3 rounded-xl bg-brand-navy p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-navy [&>svg]:h-5 [&>svg]:w-5">
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{titulo}</p>
          <p className="mt-0.5 text-xs text-white/60">{descricao}</p>
        </div>
        <IconeSeta className="mt-1.5 h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-orange" />
      </div>
    </Link>
  )
}
