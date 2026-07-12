import { Suspense } from 'react'
import { FiltrosSidebarGestor } from './filtros-sidebar'

export default function GestorConsultorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-slate-50">
      <Suspense fallback={<div className="w-56 shrink-0 border-r border-slate-200 bg-white" />}>
        <FiltrosSidebarGestor />
      </Suspense>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
