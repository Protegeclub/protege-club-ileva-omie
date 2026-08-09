'use client'

import { useMemo, useState } from 'react'
import { Botao } from '@/lib/ui/botao'
import { DrawerConsultor } from './drawer-consultor'

export type StatusAcesso = 'ativo' | 'pendente' | 'nunca_convidado'

export interface LinhaAcesso {
  cod_consultor: number
  nome: string
  email: string
  equipe: string
  status: StatusAcesso
}

export const CONFIG_STATUS: Record<StatusAcesso, { label: string; classes: string; ponto: string }> = {
  ativo: { label: 'Ativo', classes: 'bg-emerald-50 text-emerald-700', ponto: 'bg-emerald-500' },
  pendente: { label: 'Convite pendente', classes: 'bg-amber-50 text-amber-700', ponto: 'bg-amber-500' },
  nunca_convidado: { label: 'Nunca convidado', classes: 'bg-slate-100 text-slate-500', ponto: 'bg-slate-400' },
}

export function BadgeStatusAcesso({ status }: { status: StatusAcesso }) {
  const { label, classes, ponto } = CONFIG_STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ponto}`} aria-hidden />
      {label}
    </span>
  )
}

function IconeBusca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Busca/filtros/ordenação 100% client-side sobre os dados já carregados — mesmo padrão já
// usado em TabelaGestor.tsx, sem round-trip ao servidor. Clicar numa linha abre o Drawer em vez
// de navegar pra outra página (pedido explícito, estilo HubSpot).
export function TabelaAcessos({
  linhas,
  equipesDisponiveis,
}: {
  linhas: LinhaAcesso[]
  equipesDisponiveis: string[]
}) {
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'' | StatusAcesso>('')
  const [equipeFiltro, setEquipeFiltro] = useState('')
  const [selecionado, setSelecionado] = useState<LinhaAcesso | null>(null)

  const linhasFiltradas = useMemo(() => {
    // Remove um "#" na frente antes de comparar — os códigos aparecem como "#123" na própria
    // linha da tabela (ver <td> abaixo), então buscar "#123" é o esperado (mesmo fix aplicado em
    // TabelaGestor.tsx).
    const buscaLower = busca.trim().toLowerCase().replace(/^#/, '')
    return linhas.filter((l) => {
      if (statusFiltro && l.status !== statusFiltro) return false
      if (equipeFiltro && l.equipe !== equipeFiltro) return false
      if (buscaLower && !l.nome.toLowerCase().includes(buscaLower) && String(l.cod_consultor) !== buscaLower) {
        return false
      }
      return true
    })
  }, [linhas, busca, statusFiltro, equipeFiltro])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Acesso dos consultores</h3>
        <p className="text-sm text-slate-500">
          {linhas.filter((l) => l.status !== 'nunca_convidado').length} de {linhas.length} consultores
          ativos já têm acesso ao sistema.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Buscar consultor"
            type="text"
            placeholder="Buscar consultor…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
          />
        </div>
        <select
          aria-label="Status"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as '' | StatusAcesso)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
        >
          <option value="">Status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Convite pendente</option>
          <option value="nunca_convidado">Nunca convidado</option>
        </select>
        <select
          aria-label="Equipe"
          value={equipeFiltro}
          onChange={(e) => setEquipeFiltro(e.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
        >
          <option value="">Equipe</option>
          {equipesDisponiveis.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
        {(busca || statusFiltro || equipeFiltro) && (
          <Botao
            type="button"
            variante="fantasma"
            className="h-11"
            onClick={() => {
              setBusca('')
              setStatusFiltro('')
              setEquipeFiltro('')
            }}
          >
            Limpar filtros
          </Botao>
        )}
      </div>

      <div data-testid="tabela-consultores" className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-white text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Consultor</th>
              <th className="px-4 py-3 font-medium">Equipe</th>
              <th className="px-4 py-3 font-medium">E-mail (Ileva)</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((linha) => (
              <tr
                key={linha.cod_consultor}
                tabIndex={0}
                onClick={() => setSelecionado(linha)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelecionado(linha)
                  }
                }}
                className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
              >
                <td className="px-4 py-3 text-slate-800">
                  <span className="font-medium">{linha.nome}</span>{' '}
                  <span className="text-slate-400">#{linha.cod_consultor}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{linha.equipe}</td>
                <td className="px-4 py-3 text-slate-500">{linha.email || '—'}</td>
                <td className="px-4 py-3">
                  <BadgeStatusAcesso status={linha.status} />
                </td>
              </tr>
            ))}
            {linhasFiltradas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhum consultor encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DrawerConsultor consultor={selecionado} onFechar={() => setSelecionado(null)} />
    </div>
  )
}
