import { BotaoSair } from '@/lib/auth/botao-sair'

export default function ComercialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-sm font-medium text-slate-500">Painel Comercial</h1>
        <BotaoSair />
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
