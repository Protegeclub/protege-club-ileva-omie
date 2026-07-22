'use client'

import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  IconeAdesao,
  IconeAlerta,
  IconeColapsar,
  IconeDashboard,
  IconePlaca,
  IconeRastreador,
  IconeRecorrencia,
} from '@/lib/ui/icones-sidebar'
import { ItemNavSidebar } from '@/lib/ui/item-nav-sidebar'

// Client Component pelo mesmo motivo do SidebarGestor (usePathname + useState de colapso), e
// também porque precisa de useSearchParams: os links carregam a querystring atual
// (ano/mes/equipe) pra não resetar o período selecionado ao trocar de tela pelo menu — mesma
// ideia do `qs` já montado em consultor/page.tsx hoje. "Inadimplentes" é exceção (não usa
// período, é "estado atual" — ver consultor/inadimplentes/page.tsx).
export function SidebarConsultor({ nome, children }: { nome: string | null; children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [colapsado, setColapsado] = useState(false)

  const qs = searchParams.toString()
  const comQs = (href: string) => (qs ? `${href}?${qs}` : href)

  const itens = [
    { rota: '/consultor', href: comQs('/consultor'), label: 'Dashboard', icone: <IconeDashboard /> },
    { rota: '/consultor/adesoes', href: comQs('/consultor/adesoes'), label: 'Adesões', icone: <IconeAdesao /> },
    {
      rota: '/consultor/recorrencia',
      href: comQs('/consultor/recorrencia'),
      label: 'Recorrência',
      icone: <IconeRecorrencia />,
    },
    {
      rota: '/consultor/rastreadores',
      href: comQs('/consultor/rastreadores'),
      label: 'Descontos de Rastreadores',
      icone: <IconeRastreador />,
    },
    {
      rota: '/consultor/placas-ativadas',
      href: comQs('/consultor/placas-ativadas'),
      label: 'Placas Ativadas',
      icone: <IconePlaca />,
    },
    {
      rota: '/consultor/inadimplentes',
      href: '/consultor/inadimplentes',
      label: 'Inadimplentes',
      icone: <IconeAlerta />,
    },
  ]

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
              <p className="text-xs text-white/50">Consultor</p>
            </>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {itens.map((item) => (
          <ItemNavSidebar
            key={item.rota}
            href={item.href}
            label={item.label}
            icone={item.icone}
            ativo={pathname === item.rota}
            colapsado={colapsado}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">{children}</div>
    </aside>
  )
}
