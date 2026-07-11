'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { sair } from './actions'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Sidebar compartilhada entre o dashboard e as 4 telas de detalhe (adesões, recorrência,
// rastreadores, inadimplentes) — os filtros (ano/mês/equipe) precisam persistir enquanto o
// consultor navega entre elas, igual no Power BI que estamos substituindo. Fica no layout.tsx
// (não em cada page.tsx) porque layouts não recebem `searchParams` do Next.js — só Client
// Components conseguem ler a URL atual em qualquer nível com `useSearchParams()`.
export function FiltrosSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Inadimplência é "estado atual" (quem está atrasado agora), não faz sentido filtrar por
  // mês/ano — igual ao painel de origem (pasta "Telas Cosultores", print de Inadimplentes).
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

  return (
    <aside className="w-56 shrink-0 space-y-6 border-r border-slate-200 bg-white p-5">
      {!ocultarPeriodo && (
        <>
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Ano</p>
            <div className="flex flex-col gap-1.5">
              {anosDisponiveis.map((a) => (
                <button
                  key={a}
                  onClick={() => irPara({ ano: a })}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    a === ano
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Mês</p>
            <select
              value={mes}
              onChange={(e) => irPara({ mes: Number(e.target.value) })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              className="rounded border-slate-300"
            />
            Visualizar dados da equipe
          </label>
        </>
      )}

      <button
        onClick={() => sair()}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Sair
      </button>
    </aside>
  )
}
