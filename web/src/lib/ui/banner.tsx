import type { ReactNode } from 'react'

// Caixa de mensagem — centraliza os banners de aviso/erro/sucesso/vazio repetidos à mão em
// muitos arquivos (ex.: "apuração ainda não gerada", erros de permissão, mensagens de sucesso
// dos formulários de gerar apuração). Cores semânticas, não de marca — ver Selo.
const TONS = {
  aviso: 'border-amber-200 bg-amber-50 text-amber-800',
  erro: 'border-red-200 bg-red-50 text-red-700',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutro: 'border-slate-200 bg-slate-50 text-slate-500',
} as const

export function Banner({
  children,
  tom = 'neutro',
  className,
}: {
  children: ReactNode
  tom?: keyof typeof TONS
  className?: string
}) {
  return (
    <div className={`rounded-xl border p-4 text-sm ${TONS[tom]} ${className ?? ''}`}>
      {children}
    </div>
  )
}
