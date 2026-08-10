'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BotaoAtualizarPagina } from '@/lib/ui/botao-atualizar-pagina'
import { Cartao } from '@/lib/ui/cartao'
import { IconeUsuarios } from '@/lib/ui/icones-sidebar'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Barra de filtro compartilhada entre o dashboard e as sub-telas (adesões, recorrência,
// rastreadores, placas ativadas) — os filtros (ano/mês/equipe) precisam persistir enquanto o
// consultor navega entre elas. Era uma sidebar vertical (incluindo o botão Sair, já que o header
// do Consultor não tinha logout); virou uma barra horizontal no topo do conteúdo agora que o
// menu lateral de navegação (SidebarConsultor) assumiu a coluna esquerda e já tem Sair no rodapé
// — manter os dois seria duplicar o controle de logout.
export function FiltrosToolbar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Inadimplência é "estado atual" (quem está atrasado agora), não faz sentido filtrar por
  // mês/ano — igual ao painel de origem (pasta "Telas Cosultores", print de Inadimplentes).
  const ocultarPeriodo = pathname.endsWith('/inadimplentes')

  if (ocultarPeriodo) return null

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
