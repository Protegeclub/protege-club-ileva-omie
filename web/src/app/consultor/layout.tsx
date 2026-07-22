import { Suspense } from 'react'
import { BotaoSair } from '@/lib/auth/botao-sair'
import { buscarUsuarioLogado } from '@/lib/auth/usuario-logado'
import { FiltrosToolbar } from './filtros-toolbar'
import { SidebarConsultor } from './sidebar'

export default async function ConsultorLayout({ children }: { children: React.ReactNode }) {
  const usuario = await buscarUsuarioLogado()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Suspense por causa do useSearchParams nos Client Components — exigência do Next.js. */}
      <Suspense fallback={<div className="h-screen w-60 shrink-0 bg-brand-navy" />}>
        <SidebarConsultor nome={usuario?.nome ?? null}>
          <BotaoSair />
        </SidebarConsultor>
      </Suspense>
      <main className="min-w-0 flex-1 overflow-x-auto p-6">
        <Suspense fallback={<div className="mb-6 h-[92px] rounded-xl border border-slate-200 bg-white" />}>
          <FiltrosToolbar />
        </Suspense>
        {children}
      </main>
    </div>
  )
}
