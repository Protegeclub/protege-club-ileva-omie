export default function ConsultorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-sm font-medium text-slate-500">Painel do Consultor</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
