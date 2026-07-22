'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { IconeColapsar, IconeDashboard, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { ItemNavSidebar } from '@/lib/ui/item-nav-sidebar'
import { IconeRelampago } from './gerar/icones'

const ITENS = [
  { href: '/gestor', label: 'Apuração', icone: <IconeDashboard /> },
  { href: '/gestor/gerar', label: 'Gerar apuração', icone: <IconeRelampago /> },
  { href: '/gestor/acessos', label: 'Acessos', icone: <IconeUsuarios /> },
]

// "Apuração" fica destacado também dentro do detalhe de um consultor (/gestor/consultor/[cod]/*)
// — é uma tela "filha" da lista, alcançada clicando num consultor nela.
function ehAtivo(href: string, pathname: string) {
  if (href === '/gestor') {
    return pathname === '/gestor' || pathname.startsWith('/gestor/consultor')
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
      <div className="flex items-center gap-2 px-4 py-4">
        <Image
          src="/Logo Protege Club.png"
          alt="Protege Club"
          width={32}
          height={32}
          priority
          className="h-8 w-8 shrink-0"
        />
        {!colapsado && <span className="truncate text-sm font-semibold text-white">Protege Club</span>}
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
        <div className={`mx-3 mb-3 rounded-lg bg-white/5 px-3 py-2.5 ${colapsado ? 'text-center' : ''}`}>
          {colapsado ? (
            <span className="text-sm font-semibold text-white">{nome.charAt(0).toUpperCase()}</span>
          ) : (
            <>
              <p className="truncate text-sm font-medium text-white">{nome}</p>
              <p className="text-xs text-white/50">Gestor</p>
            </>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
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

      <div className="border-t border-white/10 p-3">{children}</div>
    </aside>
  )
}
