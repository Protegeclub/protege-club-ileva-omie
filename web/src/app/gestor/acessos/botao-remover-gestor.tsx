'use client'

import { useActionState } from 'react'
import { Botao } from '@/lib/ui/botao'
import { removerAcessoGestor, type RemoverAcessoEstado } from './actions'

const estadoInicial: RemoverAcessoEstado = {}

export function BotaoRemoverGestor({ userId, nome }: { userId: string; nome: string }) {
  const [estado, formAction, pendente] = useActionState(removerAcessoGestor, estadoInicial)

  if (estado.sucesso) {
    return <span className="text-xs text-emerald-600">Acesso removido.</span>
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const confirmado = window.confirm(
          `Remover o acesso de Gestor de ${nome}? Essa pessoa não vai mais conseguir entrar no sistema até ser convidada de novo.`
        )
        if (!confirmado) e.preventDefault()
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <Botao type="submit" variante="fantasma" tamanho="sm" disabled={pendente}>
        {pendente ? 'Removendo...' : 'Remover'}
      </Botao>
      {estado.erro ? <p className="mt-1 text-xs text-red-600">{estado.erro}</p> : null}
    </form>
  )
}
