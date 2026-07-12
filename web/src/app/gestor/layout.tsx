import Link from 'next/link'
import { BotaoSair } from '@/lib/auth/botao-sair'
import { LogoTitulo } from '@/lib/ui/logo-titulo'

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <LogoTitulo titulo="Painel do Gestor" />
        <div className="flex items-center gap-4">
          <nav className="flex gap-4 text-sm">
            <Link href="/gestor" className="text-slate-600 hover:text-slate-900">
              Apuração
            </Link>
            <Link href="/gestor/acessos" className="text-slate-600 hover:text-slate-900">
              Acesso dos consultores
            </Link>
          </nav>
          <BotaoSair />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
