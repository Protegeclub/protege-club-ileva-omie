import { BotaoSair } from '@/lib/auth/botao-sair'
import { buscarUsuarioLogado } from '@/lib/auth/usuario-logado'
import { SidebarGestor } from './sidebar'

export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const usuario = await buscarUsuarioLogado()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarGestor nome={usuario?.nome ?? null}>
        <BotaoSair />
      </SidebarGestor>
      <main className="min-w-0 flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  )
}
