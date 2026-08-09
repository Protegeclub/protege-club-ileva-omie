import Link from 'next/link'
import type { ReactNode } from 'react'
import { IconeSeta } from './icones-sidebar'

// Atalho em formato de "módulo" (ícone grande + título + descrição + seta), em vez de um botão
// de texto solto — usado nos dois painéis (Gestor→consultor e Consultor) pra navegar pras
// sub-telas de Adesões/Recorrência/Descontos/Placas/Inadimplentes. Selo branco sólido com ícone
// na mesma cor do fundo do card — não usa o `Cartao` compartilhado porque ele fixa fundo branco;
// segue o mesmo padrão do bloco "Total a receber" do dashboard, que também é sólido sem passar
// pelo `Cartao`.
// Cor por categoria, alinhada ao mesmo significado fixo usado nos gráficos e no Resumo
// Financeiro (09/08/2026): laranja da marca = Adesão, azul da marca = Recorrência, vermelho =
// atenção/custo (Descontos, Inadimplentes), navy = Placas (só pra diferenciar do resto).
const CORES = {
  navy: { fundo: 'bg-brand-navy', icone: 'text-brand-navy' },
  vermelho: { fundo: 'bg-red-600', icone: 'text-red-600' },
  azul: { fundo: 'bg-brand-blue', icone: 'text-brand-blue' },
  laranja: { fundo: 'bg-brand-orange', icone: 'text-brand-orange' },
} as const

export function CardAtalho({
  href,
  icone,
  titulo,
  descricao,
  cor,
}: {
  href: string
  icone: ReactNode
  titulo: string
  descricao: string
  cor: keyof typeof CORES
}) {
  const paleta = CORES[cor]
  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
    >
      <div
        className={`flex h-full items-start gap-3 rounded-xl ${paleta.fundo} p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${paleta.icone} [&>svg]:h-5 [&>svg]:w-5`}
        >
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{titulo}</p>
          <p className="mt-0.5 text-xs text-white/60">{descricao}</p>
        </div>
        <IconeSeta className="mt-1.5 h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
      </div>
    </Link>
  )
}
