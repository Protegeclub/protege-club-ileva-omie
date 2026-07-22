'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Ano</p>
        <div className="flex gap-1.5">
          {anosDisponiveis.map((a) => (
            <button
              key={a}
              onClick={() => irPara({ ano: a })}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                a === ano
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Mês</p>
        <select
          value={mes}
          onChange={(e) => irPara({ mes: Number(e.target.value) })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          {NOMES_MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>
              {nome}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={equipe}
          onChange={(e) => irPara({ equipe: e.target.checked })}
          className="rounded border-slate-300 text-brand-navy focus:ring-brand-blue"
        />
        Visualizar dados da equipe
      </label>
    </div>
  )
}
