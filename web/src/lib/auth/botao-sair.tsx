import { Botao } from '@/lib/ui/botao'
import { sair } from './actions'

// Server Component simples — não precisa de 'use client' nem onClick, um <form> pode chamar uma
// Server Action direto no `action`. Usado nos 2 layouts (gestor, consultor).
export function BotaoSair() {
  return (
    <form action={sair}>
      <Botao type="submit" variante="fantasma" tamanho="sm">
        Sair
      </Botao>
    </form>
  )
}
