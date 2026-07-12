import { Suspense } from 'react'
import { LogoTitulo } from '@/lib/ui/logo-titulo'
import { FiltrosSidebar } from './filtros-sidebar'

export default function ConsultorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Suspense por causa do useSearchParams no Client Component — exigência do Next.js. */}
      <Suspense fallback={<div className="w-56 shrink-0 border-r border-slate-200 bg-white" />}>
        <FiltrosSidebar />
      </Suspense>
      <div className="flex-1">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <LogoTitulo titulo="Painel do Consultor" />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
