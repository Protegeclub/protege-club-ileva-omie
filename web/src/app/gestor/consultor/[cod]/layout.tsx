import { Suspense } from 'react'
import { FiltrosToolbarGestor } from './filtros-toolbar'

export default function GestorConsultorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Suspense por causa do useSearchParams no Client Component — exigência do Next.js. */}
      <Suspense fallback={<div className="mb-6 h-[92px] rounded-xl border border-slate-200 bg-white" />}>
        <FiltrosToolbarGestor />
      </Suspense>
      {children}
    </div>
  )
}
