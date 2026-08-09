'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NOMES_MESES } from '@/app/consultor/tipos'
import { Botao } from '@/lib/ui/botao'
import { IconeAtualizar, IconeUsuarios } from '@/lib/ui/icones-sidebar'

// Igual a web/src/app/consultor/filtros-toolbar.tsx, mas sem o botão Sair (o menu lateral do
// Gestor já tem um no rodapé) e com um link de volta para a lista de consultores. Era uma
// sidebar vertical; virou uma barra horizontal no topo do conteúdo quando o menu lateral de
// navegação (SidebarGestor) passou a ocupar a coluna esquerda da tela.
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

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <Link href="/gestor/consultores" className="text-sm text-slate-500 hover:text-brand-navy hover:underline">
        ← Voltar para lista
      </Link>

      {!ocultarPeriodo && (
        <>
          <div className="h-6 w-px bg-slate-200" aria-hidden />

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
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
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
              className="rounded border-slate-300 text-brand-navy focus-visible:ring-brand-blue"
            />
            <IconeUsuarios className="h-4 w-4 text-slate-400" />
            Visualizar dados da equipe
          </label>
        </>
      )}

      <Botao type="button" variante="fantasma" className="ml-auto h-11" onClick={() => router.refresh()}>
        <IconeAtualizar className="h-4 w-4" />
        Atualizar
      </Botao>
    </div>
  )
}
