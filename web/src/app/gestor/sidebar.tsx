'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { IconeColapsar, IconeDashboard, IconeLista, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { ItemNavSidebar } from '@/lib/ui/item-nav-sidebar'
import { IconeRelampago } from './gerar/icones'

const ITENS = [
  { href: '/gestor', label: 'Dashboard', icone: <IconeDashboard /> },
  { href: '/gestor/consultores', label: 'Consultores', icone: <IconeLista /> },
  { href: '/gestor/gerar', label: 'Gerar', icone: <IconeRelampago /> },
  { href: '/gestor/acessos', label: 'Acessos', icone: <IconeUsuarios /> },
]

// "Consultores" fica destacado também dentro do detalhe de um consultor
// (/gestor/consultor/[cod]/*) — é uma tela "filha" da lista, alcançada clicando num consultor
// nela. "Dashboard" só fica ativo em /gestor exato, senão os dois itens acendiam juntos.
function ehAtivo(href: string, pathname: string) {
  if (href === '/gestor') {
    return pathname === '/gestor'
  }
  if (href === '/gestor/consultores') {
    return pathname.startsWith('/gestor/consultores') || pathname.startsWith('/gestor/consultor/')
  }
  return pathname.startsWith(href)
}

// Client Component porque precisa de usePathname (item ativo) e useState (recolher/expandir) —
// o estado de recolhido afeta o menu inteiro (logo, card de usuário, rótulos), não dá pra
// isolar só um pedacinho como client. O botão Sair (Server Component) entra como `children`.
export function SidebarGestor({ nome, children }: { nome: string | null; children: ReactNode }) {
  const pathname = usePathname()
  const [colapsado, setColapsado] = useState(false)

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-y-auto bg-brand-navy transition-[width] duration-200 ${
        colapsado ? 'w-[76px]' : 'w-60'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-6">
        <Image
          src="/Logo Protege Club.png"
          alt="Protege Club"
          width={36}
          height={36}
          priority
          className="h-9 w-9 shrink-0"
        />
        {!colapsado && <span className="truncate text-xs font-semibold tracking-wide text-white">Protege Club</span>}
        <button
          type="button"
          onClick={() => setColapsado((v) => !v)}
          aria-expanded={!colapsado}
          aria-label={colapsado ? 'Expandir menu' : 'Recolher menu'}
          className="ml-auto shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconeColapsar className={`h-4 w-4 transition-transform ${colapsado ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {nome && (
        <div
          className={`mx-3.5 mb-5 flex items-center gap-2.5 rounded-lg bg-white/5 px-3.5 py-3 ${
            colapsado ? 'justify-center px-0' : ''
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/90 text-xs font-semibold text-brand-navy">
            {nome.charAt(0).toUpperCase()}
          </span>
          {!colapsado && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{nome}</p>
              <p className="text-[11px] text-white/50">Gestor</p>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-2.5 px-3.5">
        {ITENS.map((item) => (
          <ItemNavSidebar
            key={item.href}
            href={item.href}
            label={item.label}
            icone={item.icone}
            ativo={ehAtivo(item.href, pathname)}
            colapsado={colapsado}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3.5">{children}</div>
    </aside>
  )
}
