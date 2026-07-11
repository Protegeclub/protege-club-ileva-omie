import { sair } from './actions'

// Server Component simples — não precisa de 'use client' nem onClick, um <form> pode chamar uma
// Server Action direto no `action`. Usado nos 3 layouts (gestor, comercial, consultor).
export function BotaoSair({ className }: { className?: string }) {
  return (
    <form action={sair}>
      <button
        type="submit"
        className={className ?? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800'}
      >
        Sair
      </button>
    </form>
  )
}
