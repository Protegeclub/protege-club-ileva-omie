'use client'

import { useActionState } from 'react'
import { Botao } from '@/lib/ui/botao'
import { convidarConsultor, type ConvidarEstado } from './actions'

const estadoInicial: ConvidarEstado = {}

export function ConvidarButton({ codConsultor }: { codConsultor: number }) {
  const [estado, formAction, pendente] = useActionState(convidarConsultor, estadoInicial)

  if (estado.sucesso) {
    return (
      <span className="text-xs text-emerald-700">
        Convite enviado para {estado.emailConvidado}
      </span>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="cod_consultor" value={codConsultor} />
      <Botao type="submit" disabled={pendente} variante="fantasma" tamanho="sm">
        {pendente ? 'Convidando...' : 'Convidar'}
      </Botao>
      {estado.erro ? <span className="text-xs text-red-600">{estado.erro}</span> : null}
    </form>
  )
}
