'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/gestor', label: 'Apuração' },
  { href: '/gestor/gerar', label: 'Gerar apuração' },
  { href: '/gestor/acessos', label: 'Acessos' },
]

// Único Client Component novo deste rebrand — indicar a aba ativa exige saber o pathname atual,
// e Server Component não tem acesso direto a isso sem gambiarra (mesma necessidade que já
// justificava filtros-sidebar.tsx ser Client Component).
export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 text-sm">
      {LINKS.map((link) => {
        const ativo = link.href === '/gestor' ? pathname === '/gestor' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              ativo ? 'bg-brand-navy/10 text-brand-navy' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
