import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

// Componente 100% servidor (sem 'use client', sem hooks, sem estado) — funciona igual chamado
// de dentro de uma página server ou de um Client Component que já existe (TabelaGestor,
// gerar-lote-form, os filtros-sidebar) sem transformar quem o usa num Client Component.
//
// Regra de contraste (calculada com a fórmula de luminância do WCAG contra os hexadecimais reais
// da marca — ver CONTEXTO_E_CHECKLIST.md): fundo navy aceita texto branco (14.4:1), mas fundo
// azul claro ou laranja NUNCA deve levar texto branco (ficam em ~2.4-2.7:1, reprovado até pra
// texto grande) — por isso "secundaria" e "destaque" usam texto navy, não branco.
const VARIANTES = {
  primaria: 'bg-brand-navy text-white hover:bg-brand-navy-hover',
  secundaria: 'bg-sky-50 text-brand-navy border border-brand-blue/40 hover:bg-sky-100',
  destaque: 'bg-brand-orange text-brand-navy hover:bg-brand-orange-hover font-semibold',
  fantasma: 'border border-slate-300 text-slate-600 hover:bg-slate-50',
  // Mesma ideia do "fantasma", mas pra usar sobre fundo escuro (menu lateral navy) — o
  // "fantasma" normal (border-slate-300/text-slate-600) fica quase invisível ali.
  'fantasma-claro': 'border border-white/20 text-white/70 hover:bg-white/10 hover:text-white',
} as const

const TAMANHOS = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
} as const

export type VarianteBotao = keyof typeof VARIANTES

interface PropsComuns {
  variante?: VarianteBotao
  tamanho?: keyof typeof TAMANHOS
  className?: string
  children: ReactNode
}

type PropsLink = PropsComuns &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & { href: string }

type PropsBotao = PropsComuns &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined }

export function Botao(props: PropsLink | PropsBotao) {
  const { variante = 'primaria', tamanho = 'md', className, children, ...resto } = props
  const classes = `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className ?? ''}`

  if ('href' in props && props.href) {
    const { href, target, rel, ...anchorResto } = resto as AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string
    }
    if (target) {
      return (
        <a href={href} target={target} rel={rel} className={classes} {...anchorResto}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes} {...anchorResto}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...(resto as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
