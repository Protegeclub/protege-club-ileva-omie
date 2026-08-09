import Link from 'next/link'
import type { ReactNode } from 'react'

// Item de menu lateral — sem hooks próprios, recebe `ativo`/`colapsado` já calculados pelo pai
// (SidebarGestor/SidebarConsultor, que são Client Components por causa do usePathname/useState
// de recolher). Compartilhado entre os dois painéis porque é puramente visual, sem lógica de
// negócio nenhuma.
export function ItemNavSidebar({
  href,
  label,
  icone,
  ativo,
  colapsado,
}: {
  href: string
  label: string
  icone: ReactNode
  ativo: boolean
  colapsado: boolean
}) {
  return (
    <Link
      href={href}
      title={colapsado ? label : undefined}
      aria-current={ativo ? 'page' : undefined}
      className={`flex items-center gap-3.5 rounded-xl border-l-2 px-3.5 py-3 text-xs font-medium tracking-wide transition-all hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy ${
        colapsado ? 'justify-center hover:translate-x-0' : ''
      } ${
        ativo
          ? 'border-brand-orange bg-white/10 text-white shadow-sm'
          : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="shrink-0 [&>svg]:h-6 [&>svg]:w-6">{icone}</span>
      {!colapsado && <span className="truncate">{label}</span>}
    </Link>
  )
}
