'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  IconeCarteira,
  IconeColapsar,
  IconeConfiguracoes,
  IconeDashboard,
  IconeLista,
  IconeRelatorio,
  IconeUsuarios,
} from '@/lib/ui/icones-sidebar'
import { FundoDecorativoSidebar } from '@/lib/ui/fundo-decorativo-sidebar'
import { ItemNavSidebar } from '@/lib/ui/item-nav-sidebar'
import { IconeRelampago } from './gerar/icones'

const SECOES = [
  {
    titulo: 'VISÃO GERAL',
    itens: [
      { href: '/gestor', label: 'Dashboard', icone: <IconeDashboard /> },
      { href: '/gestor/consultores', label: 'Consultores', icone: <IconeLista /> },
      { href: '/gestor/relatorios', label: 'Relatórios', icone: <IconeRelatorio /> },
    ],
  },
  {
    titulo: 'OPERAÇÃO',
    itens: [
      { href: '/gestor/gerar', label: 'Gerar apuração', icone: <IconeRelampago /> },
      { href: '/gestor/omie', label: 'Omie', icone: <IconeCarteira /> },
    ],
  },
  {
    titulo: 'ADMINISTRAÇÃO',
    itens: [
      { href: '/gestor/acessos', label: 'Acessos', icone: <IconeUsuarios /> },
      { href: '/gestor/configuracoes', label: 'Configurações', icone: <IconeConfiguracoes /> },
    ],
  },
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
      <FundoDecorativoSidebar />
      <div className="flex items-center gap-3 px-4 py-6">
        <Image
          src="/Logo Protege Club.png"
          alt="ProtegeClub"
          width={36}
          height={36}
          priority
          className="h-9 w-9 shrink-0"
        />
        {!colapsado && <span className="truncate text-xs font-semibold tracking-wide text-white">ProtegeClub</span>}
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

      <nav className="flex-1 space-y-5 px-3.5">
        {SECOES.map((secao, indice) => (
          <div
            key={secao.titulo}
            className={colapsado && indice > 0 ? 'border-t border-white/10 pt-4' : ''}
          >
            {!colapsado && (
              <p className="mb-2 px-3.5 text-[11px] font-semibold tracking-wider text-white/40">
                {secao.titulo}
              </p>
            )}
            <div className="space-y-2.5">
              {secao.itens.map((item) => (
                <ItemNavSidebar
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icone={item.icone}
                  ativo={ehAtivo(item.href, pathname)}
                  colapsado={colapsado}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3.5">{children}</div>
    </aside>
  )
}
