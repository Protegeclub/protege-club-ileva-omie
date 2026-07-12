'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NOMES_MESES } from '@/app/consultor/tipos'

// Igual a web/src/app/consultor/filtros-sidebar.tsx, mas sem o botão Sair (o Gestor já tem um
// no header do layout pai) e com um link de volta para a lista de consultores.
export function FiltrosSidebarGestor() {
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

  return (
    <aside className="w-56 shrink-0 space-y-6 border-r border-slate-200 bg-white p-5">
      <Link
        href="/gestor"
        className="block rounded-md border border-slate-300 px-3 py-1.5 text-center text-sm text-slate-600 hover:bg-slate-50"
      >
        ← Voltar para lista
      </Link>

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
    </aside>
  )
}
