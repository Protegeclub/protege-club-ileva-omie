'use client'

import { useState } from 'react'

// Posição do balão relativa ao "?" — numa fileira apertada de cards, centralizar sempre faz o
// balão vazar da tela nos cards das pontas (visto de verdade no card mais à direita, "Comissão
// líquida", com texto cortado no fim da viewport). "esquerda"/"direita" ancoram numa borda do "?"
// em vez do centro, pros cards das pontas de cada fileira.
const ALINHAMENTO = {
  esquerda: { balao: 'left-0', seta: 'left-2' },
  centro: { balao: 'left-1/2 -translate-x-1/2', seta: 'left-1/2 -translate-x-1/2' },
  direita: { balao: 'right-0', seta: 'right-2' },
} as const

// Bolha de ajuda ("?" + balão) usada nos cards financeiros pra explicar como cada valor é
// calculado — a pedido do Samuel (07/08/2026), depois de repetidas dúvidas/investigações sobre
// como cada métrica é apurada. Funciona por hover (desktop) OU clique (mobile/touch, onde hover
// não existe) — por isso guarda um estado próprio em vez de depender só de `group-hover` do CSS.
export function DicaInfo({ texto, alinhar = 'centro' }: { texto: string; alinhar?: keyof typeof ALINHAMENTO }) {
  const [aberto, setAberto] = useState(false)
  const paleta = ALINHAMENTO[alinhar]

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setAberto((v) => !v)
        }}
        onBlur={() => setAberto(false)}
        aria-label="Como esse valor é calculado"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold leading-none text-slate-400 transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-10 mt-2 w-48 rounded-lg bg-brand-navy px-3 py-2 text-xs leading-snug text-white shadow-lg transition-opacity ${paleta.balao} ${
          aberto ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
        }`}
      >
        {texto}
        <span className={`absolute bottom-full border-4 border-transparent border-b-brand-navy ${paleta.seta}`} />
      </span>
    </span>
  )
}
