import { Botao, type VarianteBotao } from '@/lib/ui/botao'
import { sair } from './actions'

// Server Component simples — não precisa de 'use client' nem onClick, um <form> pode chamar uma
// Server Action direto no `action`. Usado nos 2 menus laterais (gestor, consultor) — `variante`
// tem default "fantasma-claro" porque hoje só é usado sobre o fundo navy do menu.
export function BotaoSair({ variante = 'fantasma-claro' }: { variante?: VarianteBotao }) {
  return (
    <form action={sair}>
      <Botao type="submit" variante={variante} tamanho="sm" className="w-full">
        Sair
      </Botao>
    </form>
  )
}
