'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NOMES_MESES } from '@/app/consultor/tipos'
import { BotaoAtualizarPagina } from '@/lib/ui/botao-atualizar-pagina'
import { Cartao } from '@/lib/ui/cartao'
import { IconeUsuarios } from '@/lib/ui/icones-sidebar'

// Igual a web/src/app/consultor/filtros-toolbar.tsx, mas sem o botão Sair (o menu lateral do
// Gestor já tem um no rodapé). Era uma sidebar vertical; virou uma barra horizontal no topo do
// conteúdo quando o menu lateral de navegação (SidebarGestor) passou a ocupar a coluna esquerda
// da tela. O link "Voltar para lista" que existia aqui foi removido — cada sub-tela já tem seu
// próprio "Voltar ao resumo" (ver CabecalhoPagina), então os dois juntos só duplicavam a mesma
// ação e confundiam qual usar.
export function FiltrosToolbarGestor() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const ocultarPeriodo = pathname.endsWith('/inadimplentes')

  const hoje = new Date()
  const ano = Number(searchParams.get('ano')) || hoje.getFullYear()
  const mes = Number(searchParams.get('mes')) || hoje.getMonth() + 1
  const equipe = searchParams.get('equipe') === '1'

  const anosDisponiveis = [hoje.getFullYear(), hoje.getFullYear() - 1, hoje.getFullYear() - 2]

  function irPara(novosParams: { ano?: number; mes?: number; equipe?: boolean }) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('ano', String(novosParams.ano ?? ano))
    params.set('mes', String(novosParams.mes ?? mes))
    params.set('equipe', (novosParams.equipe ?? equipe) ? '1' : '0')
    router.push(`${pathname}?${params.toString()}`)
  }

  if (ocultarPeriodo) {
    return (
      <Cartao className="mb-6 flex items-center justify-end p-3">
        <BotaoAtualizarPagina />
      </Cartao>
    )
  }

  return (
    <Cartao className="mb-6 flex flex-wrap items-center gap-3 p-3">
      <div className="flex h-11 items-center gap-1 rounded-lg bg-slate-100 p-1">
        {anosDisponiveis.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => irPara({ ano: a })}
            className={`h-full rounded-md px-3 text-sm font-medium transition-colors ${
              a === ano ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <select
        value={mes}
        onChange={(e) => irPara({ mes: Number(e.target.value) })}
        className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
      >
        {NOMES_MESES.map((nome, i) => (
          <option key={nome} value={i + 1}>
            {nome}
          </option>
        ))}
      </select>

      <div className="h-6 w-px bg-slate-200" aria-hidden />

      <label className="flex h-11 items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={equipe}
          onChange={(e) => irPara({ equipe: e.target.checked })}
          className="rounded border-slate-300 text-brand-navy focus-visible:ring-brand-blue"
        />
        <IconeUsuarios className="h-4 w-4 text-slate-400" />
        Visualizar dados da equipe
      </label>

      <div className="ml-auto">
        <BotaoAtualizarPagina />
      </div>
    </Cartao>
  )
}
