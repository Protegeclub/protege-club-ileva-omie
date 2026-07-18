import { BotaoSair } from '@/lib/auth/botao-sair'
import { LogoTitulo } from '@/lib/ui/logo-titulo'
import { NavLinks } from './nav-links'

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <LogoTitulo titulo="Painel do Gestor" />
        <div className="flex items-center gap-4">
          <NavLinks />
          <div className="h-6 w-px bg-slate-200" aria-hidden />
          <BotaoSair />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
