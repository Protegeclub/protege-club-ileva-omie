'use client'

import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  IconeAdesao,
  IconeAlerta,
  IconeColapsar,
  IconeConfiguracoes,
  IconeDashboard,
  IconeFecharMenu,
  IconeMenuHamburguer,
  IconePlaca,
  IconeRastreador,
  IconeRecorrencia,
  IconeTrofeu,
} from '@/lib/ui/icones-sidebar'
import { FundoDecorativoSidebar } from '@/lib/ui/fundo-decorativo-sidebar'
import { ItemNavSidebar } from '@/lib/ui/item-nav-sidebar'

// Client Component pelo mesmo motivo do SidebarGestor (usePathname + useState de colapso), e
// também porque precisa de useSearchParams: os links carregam a querystring atual
// (ano/mes/equipe) pra não resetar o período selecionado ao trocar de tela pelo menu — mesma
// ideia do `qs` já montado em consultor/page.tsx hoje. "Inadimplentes" é exceção (não usa
// período, é "estado atual" — ver consultor/inadimplentes/page.tsx).
//
// Abaixo de lg (pedido do Samuel, 10/08/2026: acesso pelo celular) a sidebar deixa de ficar
// sempre visível e vira um menu off-canvas (fixed + slide-in), aberto por um botão hambúrguer
// numa barra fixa no topo — o desktop (lg e acima) continua pixel a pixel igual ao que já era
// (mesma largura, mesmo botão de colapsar, sempre visível), só ganhou classes `lg:` a mais.
export function SidebarConsultor({ nome, children }: { nome: string | null; children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [colapsado, setColapsado] = useState(false)
  const [abertoMobile, setAbertoMobile] = useState(false)

  // Fecha o menu mobile ao navegar pra uma tela nova (clique num item) — sem isso o menu ficava
  // aberto por cima da tela de destino. Ajuste durante a renderização (não em useEffect) —
  // padrão recomendado pelo React pra resetar estado quando um valor externo muda no mesmo
  // componente (evita o cascading-render que um setState direto num effect causaria).
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname)
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname)
    setAbertoMobile(false)
  }

  // Trava o scroll do conteúdo por trás enquanto o menu mobile está aberto — padrão comum de
  // drawer (Linear, Notion etc.), evita rolar a página "por baixo" do overlay.
  useEffect(() => {
    if (!abertoMobile) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [abertoMobile])

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
      rota: '/consultor/plano-carreira',
      href: comQs('/consultor/plano-carreira'),
      label: 'Plano de Carreira',
      icone: <IconeTrofeu />,
    },
    {
      rota: '/consultor/inadimplentes',
      href: '/consultor/inadimplentes',
      label: 'Inadimplentes',
      icone: <IconeAlerta />,
    },
    {
      rota: '/consultor/configuracoes',
      href: '/consultor/configuracoes',
      label: 'Configurações',
      icone: <IconeConfiguracoes />,
    },
  ]

  return (
    <>
      {/* Barra mobile fixa (hambúrguer) — some a partir de lg, onde a aside abaixo já é sempre
          visível. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAbertoMobile(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-brand-navy hover:bg-slate-100"
        >
          <IconeMenuHamburguer className="h-5 w-5" />
        </button>
        <Image src="/Logo Protege Club.png" alt="ProtegeClub" width={28} height={28} className="h-7 w-7" />
        <span className="text-sm font-semibold text-brand-navy">ProtegeClub</span>
      </div>

      {/* Overlay escuro atrás do menu mobile — clicar fora fecha. */}
      {abertoMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setAbertoMobile(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col overflow-y-auto bg-brand-navy transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-[width] ${
          abertoMobile ? 'translate-x-0' : '-translate-x-full'
        } ${colapsado ? 'lg:w-[76px]' : 'lg:w-60'}`}
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
            className="ml-auto hidden shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          >
            <IconeColapsar className={`h-4 w-4 transition-transform ${colapsado ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setAbertoMobile(false)}
            aria-label="Fechar menu"
            className="ml-auto shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <IconeFecharMenu className="h-5 w-5" />
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
                <p className="text-[11px] text-white/50">Consultor</p>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-2.5 px-3.5">
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

        <div className="border-t border-white/10 p-3.5">{children}</div>
      </aside>
    </>
  )
}
