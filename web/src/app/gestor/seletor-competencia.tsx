'use client'

import { usePathname, useRouter } from 'next/navigation'
import { NOMES_MESES } from '@/app/consultor/tipos'

const MESES_LISTADOS = 24

// Substitui o antigo par de campos separados (select de mês + input de ano + botão "Ver
// período") por um único dropdown de competência ("Julho 2026"), pedido do Samuel com print de
// referência (10/08/2026). Lista os últimos 24 meses a partir de hoje — mais que suficiente pra
// navegar o histórico sem virar uma lista infinita.
function gerarOpcoes() {
  const hoje = new Date()
  const opcoes: { ano: number; mes: number; rotulo: string }[] = []
  for (let i = 0; i < MESES_LISTADOS; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const ano = data.getFullYear()
    const mes = data.getMonth() + 1
    opcoes.push({ ano, mes, rotulo: `${NOMES_MESES[mes - 1]} ${ano}` })
  }
  return opcoes
}

export function SeletorCompetencia({ ano, mes }: { ano: number; mes: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const opcoes = gerarOpcoes()

  // Garante que a competência atual da URL sempre apareça no dropdown, mesmo se for mais antiga
  // que a janela de 24 meses (ex.: link direto/compartilhado pra um período antigo).
  if (!opcoes.some((o) => o.ano === ano && o.mes === mes)) {
    opcoes.push({ ano, mes, rotulo: `${NOMES_MESES[mes - 1]} ${ano}` })
  }

  return (
    // appearance-none + seta própria: a seta nativa do <select> cola direto na borda direita,
    // sem nenhum respiro — troca por um chevron desenhado com mais espaço até a borda.
    <div className="relative">
      <select
        value={`${ano}-${mes}`}
        onChange={(e) => {
          const [novoAno, novoMes] = e.target.value.split('-')
          router.push(`${pathname}?ano=${novoAno}&mes=${novoMes}`)
        }}
        aria-label="Competência"
        className="h-11 appearance-none rounded-lg border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
      >
        {opcoes.map((o) => (
          <option key={`${o.ano}-${o.mes}`} value={`${o.ano}-${o.mes}`}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
