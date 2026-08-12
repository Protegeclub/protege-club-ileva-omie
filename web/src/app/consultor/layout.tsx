import { Suspense } from 'react'
import { BotaoSair } from '@/lib/auth/botao-sair'
import { buscarUsuarioLogado } from '@/lib/auth/usuario-logado'
import { FiltrosToolbar } from './filtros-toolbar'
import { SidebarConsultor } from './sidebar'

export default async function ConsultorLayout({ children }: { children: React.ReactNode }) {
  const usuario = await buscarUsuarioLogado()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* Suspense por causa do useSearchParams nos Client Components — exigência do Next.js.
          Fallback só ocupa espaço de verdade (w-60) a partir de lg — abaixo disso a sidebar de
          destino é um menu off-canvas (largura 0 na tela), então reservar 240px aqui derrubaria
          o conteúdo pra fora da tela por uma fração de segundo. */}
      <Suspense fallback={<div className="hidden h-screen w-60 shrink-0 bg-brand-navy lg:block" />}>
        <SidebarConsultor nome={usuario?.nome ?? null}>
          <BotaoSair />
        </SidebarConsultor>
      </Suspense>
      <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6">
        <Suspense fallback={<div className="mb-6 h-[92px] rounded-xl border border-slate-200 bg-white" />}>
          <FiltrosToolbar />
        </Suspense>
        {children}
      </main>
    </div>
  )
}
