// Na prática, o proxy.ts sempre redireciona "/" para /login (sem sessão) ou para a rota base do
// perfil (com sessão), então esta página raramente renderiza. Mantida como fallback simples.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">ProtegeClub — redirecionando…</p>
    </main>
  )
}
