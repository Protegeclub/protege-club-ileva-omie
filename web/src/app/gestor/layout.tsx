import Link from 'next/link'

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-sm font-medium text-slate-500">Painel do Gestor</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/gestor" className="text-slate-600 hover:text-slate-900">
            Apuração
          </Link>
          <Link href="/gestor/acessos" className="text-slate-600 hover:text-slate-900">
            Acesso dos consultores
          </Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
