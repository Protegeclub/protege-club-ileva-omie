'use client'

import { useMemo, useState } from 'react'
import { LinhaVazia } from './linha-vazia'

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconeOrdenacao({ estado, className }: { estado: 'asc' | 'desc' | 'nenhum'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M7 10l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={estado === 'asc' ? 1 : 0.35}
      />
      <path
        d="M7 14l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={estado === 'desc' ? 1 : 0.35}
      />
    </svg>
  )
}

// NFD decompõe acentos em letra + marca separada; removendo tudo que não é letra/número/espaço
// a marca de acento cai fora sozinha — mesma técnica usada em lib/omie/vinculo.ts, mas duplicada
// aqui (não importada) porque aquele módulo carrega o client admin do Supabase e não pode ser
// puxado por um Client Component.
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

function comparar(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pt-BR')
}

export interface ColunaTabelaListagem<T> {
  chave: string
  titulo: string
  alinhar?: 'right'
  // Texto exibido na célula (quando `render` não é passado) e usado na busca.
  texto: (item: T) => string
  // Valor comparável usado ao ordenar por essa coluna — datas em ISO ("AAAA-MM-DD") já ordenam
  // certo por comparação de string, não precisam de tratamento especial. Coluna sem `ordenar`
  // não fica clicável no cabeçalho.
  ordenar?: (item: T) => string | number
  render?: (item: T) => React.ReactNode
}

// Tabela com busca (filtra por qualquer coluna) e ordenação por clique no cabeçalho — usada nas
// telas de Adesões/Recorrência/Rastreadores/Placas/Inadimplentes (Gestor + Consultor), que antes
// eram uma <table> fixa sem nenhuma interação. O rodapé (total/contagem) é uma função das linhas
// já filtradas — buscar "silva" também atualiza o total pra refletir só o que está visível.
export function TabelaListagem<T>({
  colunas,
  linhas,
  textoVazio,
  rodape,
  larguraMinima = 640,
}: {
  colunas: ColunaTabelaListagem<T>[]
  linhas: T[]
  textoVazio: string
  rodape?: (linhasFiltradas: T[]) => React.ReactNode
  larguraMinima?: number
}) {
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<{ chave: string; direcao: 'asc' | 'desc' } | null>(null)

  const linhasFiltradas = useMemo(() => {
    const termo = normalizar(busca)
    let resultado = !termo
      ? linhas
      : linhas.filter((item) => colunas.some((c) => normalizar(c.texto(item)).includes(termo)))

    if (ordenacao) {
      const coluna = colunas.find((c) => c.chave === ordenacao.chave)
      if (coluna?.ordenar) {
        const obterValor = coluna.ordenar
        resultado = [...resultado].sort((a, b) => {
          const cmp = comparar(obterValor(a), obterValor(b))
          return ordenacao.direcao === 'asc' ? cmp : -cmp
        })
      }
    }
    return resultado
  }, [linhas, busca, ordenacao, colunas])

  function aoClicarColuna(chave: string) {
    setOrdenacao((atual) => {
      if (atual?.chave !== chave) return { chave, direcao: 'asc' }
      if (atual.direcao === 'asc') return { chave, direcao: 'desc' }
      return null
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <IconeBusca className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm" style={{ minWidth: larguraMinima }}>
          <thead className="bg-brand-navy text-white">
            <tr>
              {colunas.map((c) => (
                <th key={c.chave} className={`px-4 py-2 font-medium ${c.alinhar === 'right' ? 'text-right' : ''}`}>
                  {c.ordenar ? (
                    <button
                      type="button"
                      onClick={() => aoClicarColuna(c.chave)}
                      className={`inline-flex items-center gap-1 hover:text-white/80 focus-visible:outline-none ${
                        c.alinhar === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {c.titulo}
                      <IconeOrdenacao
                        estado={ordenacao?.chave === c.chave ? ordenacao.direcao : 'nenhum'}
                        className="h-3.5 w-3.5"
                      />
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((item, i) => (
              <tr key={i} className="border-t border-slate-100">
                {colunas.map((c) => (
                  <td key={c.chave} className={`px-4 py-2 ${c.alinhar === 'right' ? 'text-right' : ''}`}>
                    {c.render ? c.render(item) : c.texto(item)}
                  </td>
                ))}
              </tr>
            ))}
            {linhasFiltradas.length === 0 && (
              <LinhaVazia
                colSpan={colunas.length}
                texto={linhas.length === 0 ? textoVazio : `Nenhum resultado para "${busca}".`}
              />
            )}
          </tbody>
          {rodape && linhasFiltradas.length > 0 && <tfoot>{rodape(linhasFiltradas)}</tfoot>}
        </table>
      </div>
    </div>
  )
}
