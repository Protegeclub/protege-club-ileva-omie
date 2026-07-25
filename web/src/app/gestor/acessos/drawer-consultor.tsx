'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/lib/ui/botao'
import {
  convidarConsultor,
  editarEmailConsultor,
  gerarLinkAcesso,
  reenviarConvite,
  removerAcessoConsultor,
  type ConvidarEstado,
  type EditarEmailEstado,
  type LinkAcessoEstado,
  type RemoverAcessoEstado,
} from './actions'
import { BadgeStatusAcesso, type LinhaAcesso, type StatusAcesso } from './tabela-acessos'

function IconeFechar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Painel lateral (estilo HubSpot) que abre ao clicar num consultor, em vez de navegar pra outra
// página. O wrapper (`DrawerConsultor`) fica sempre montado pra animar suave a entrada/saída; o
// conteúdo (`ConteudoDrawer`) é remontado a cada consultor diferente (via `key`), pra nenhum
// `useActionState` de um consultor anterior vazar pro próximo que for aberto.
export function DrawerConsultor({
  consultor,
  onFechar,
}: {
  consultor: LinhaAcesso | null
  onFechar: () => void
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-200 ${
          consultor ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onFechar}
        aria-hidden
      />
      <aside
        data-testid="drawer-consultor"
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col overflow-hidden bg-white shadow-xl transition-transform duration-200 ${
          consultor ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {consultor && <ConteudoDrawer key={consultor.cod_consultor} consultor={consultor} onFechar={onFechar} />}
      </aside>
    </>
  )
}

function ConteudoDrawer({ consultor, onFechar }: { consultor: LinhaAcesso; onFechar: () => void }) {
  const [editandoEmail, setEditandoEmail] = useState(false)

  const [estadoConvite, acaoConvite, pendenteConvite] = useActionState<ConvidarEstado, FormData>(
    convidarConsultor,
    {}
  )
  const [estadoReenvio, acaoReenvio, pendenteReenvio] = useActionState<ConvidarEstado, FormData>(
    reenviarConvite,
    {}
  )
  const [estadoLink, acaoLink, pendenteLink] = useActionState<LinkAcessoEstado, FormData>(gerarLinkAcesso, {})
  const [estadoRemover, acaoRemover, pendenteRemover] = useActionState<RemoverAcessoEstado, FormData>(
    removerAcessoConsultor,
    {}
  )
  const [estadoEmail, acaoEmail, pendenteEmail] = useActionState<EditarEmailEstado, FormData>(
    editarEmailConsultor,
    {}
  )

  // Reflete na hora o resultado de uma ação bem-sucedida, sem esperar o Drawer fechar e reabrir
  // pra pegar os dados atualizados do servidor (o `consultor` recebido é uma cópia fixa do
  // momento em que a linha foi clicada).
  const statusEfetivo: StatusAcesso = estadoRemover.sucesso
    ? 'nunca_convidado'
    : estadoConvite.sucesso || estadoReenvio.sucesso
      ? 'pendente'
      : consultor.status

  async function copiarLink() {
    if (estadoLink.link) await navigator.clipboard.writeText(estadoLink.link)
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{consultor.nome}</h3>
          <p className="text-sm text-slate-500">{consultor.equipe}</p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <IconeFechar className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">E-mail</p>
          {editandoEmail ? (
            <form
              action={acaoEmail}
              onSubmit={() => setEditandoEmail(false)}
              className="mt-1.5 flex items-center gap-2"
            >
              <input type="hidden" name="cod_consultor" value={consultor.cod_consultor} />
              <input
                type="email"
                name="email"
                defaultValue={consultor.email}
                required
                className="h-9 flex-1 rounded-lg border border-slate-300 px-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <Botao type="submit" tamanho="sm" disabled={pendenteEmail}>
                {pendenteEmail ? 'Salvando...' : 'Salvar'}
              </Botao>
              <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => setEditandoEmail(false)}>
                Cancelar
              </Botao>
            </form>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-sm text-slate-800">{consultor.email || '—'}</p>
              {statusEfetivo !== 'nunca_convidado' && (
                <button
                  type="button"
                  onClick={() => setEditandoEmail(true)}
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
          )}
          {estadoEmail.erro && <p className="mt-1 text-xs text-red-600">{estadoEmail.erro}</p>}
          {estadoEmail.sucesso && !editandoEmail && (
            <p className="mt-1 text-xs text-emerald-600">E-mail atualizado.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
          <div className="mt-1.5">
            <BadgeStatusAcesso status={statusEfetivo} />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 p-5">
        {statusEfetivo === 'nunca_convidado' && (
          <form action={acaoConvite}>
            <input type="hidden" name="cod_consultor" value={consultor.cod_consultor} />
            <Botao type="submit" className="w-full" disabled={pendenteConvite}>
              {pendenteConvite ? 'Enviando...' : 'Enviar convite'}
            </Botao>
          </form>
        )}
        {estadoConvite.sucesso && (
          <p className="text-xs text-emerald-600">Convite enviado para {estadoConvite.emailConvidado}.</p>
        )}
        {estadoConvite.erro && <p className="text-xs text-red-600">{estadoConvite.erro}</p>}

        {statusEfetivo === 'pendente' && (
          <form action={acaoReenvio}>
            <input type="hidden" name="cod_consultor" value={consultor.cod_consultor} />
            <Botao type="submit" className="w-full" disabled={pendenteReenvio}>
              {pendenteReenvio ? 'Reenviando...' : 'Reenviar convite'}
            </Botao>
          </form>
        )}
        {estadoReenvio.sucesso && (
          <p className="text-xs text-emerald-600">Convite reenviado para {estadoReenvio.emailConvidado}.</p>
        )}
        {estadoReenvio.erro && <p className="text-xs text-red-600">{estadoReenvio.erro}</p>}

        {statusEfetivo !== 'nunca_convidado' && (
          <>
            <form action={acaoLink}>
              <input type="hidden" name="cod_consultor" value={consultor.cod_consultor} />
              <Botao type="submit" variante="secundaria" className="w-full" disabled={pendenteLink}>
                {pendenteLink ? 'Gerando...' : 'Copiar link'}
              </Botao>
            </form>
            {estadoLink.link && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="flex-1 truncate text-xs text-slate-500">{estadoLink.link}</p>
                <button
                  type="button"
                  onClick={copiarLink}
                  className="shrink-0 text-xs font-medium text-brand-blue hover:underline"
                >
                  Copiar
                </button>
              </div>
            )}
            {estadoLink.erro && <p className="text-xs text-red-600">{estadoLink.erro}</p>}
          </>
        )}

        {statusEfetivo !== 'nunca_convidado' && (
          <form
            action={acaoRemover}
            onSubmit={(e) => {
              const confirmado = window.confirm(
                `Remover o acesso de ${consultor.nome}? Essa pessoa não vai mais conseguir entrar no sistema até ser convidada de novo.`
              )
              if (!confirmado) e.preventDefault()
            }}
          >
            <input type="hidden" name="cod_consultor" value={consultor.cod_consultor} />
            <Botao type="submit" variante="fantasma" className="w-full" disabled={pendenteRemover}>
              {pendenteRemover ? 'Removendo...' : 'Remover acesso'}
            </Botao>
          </form>
        )}
        {estadoRemover.sucesso && <p className="text-xs text-emerald-600">Acesso removido.</p>}
        {estadoRemover.erro && <p className="text-xs text-red-600">{estadoRemover.erro}</p>}
      </div>
    </>
  )
}
