'use client'

import { useRouter } from 'next/navigation'
import { Botao } from './botao'
import { IconeAtualizar } from './icones-sidebar'

// Botão "Atualizar" (router.refresh()) pra páginas Server Component que não têm nenhum outro
// Client Component no header — evita transformar a página inteira em client só por causa de um
// botão. TabelaGestor.tsx já é Client Component por outros motivos, então mantém o próprio botão
// inline em vez de usar este aqui.
export function BotaoAtualizarPagina() {
  const router = useRouter()
  return (
    <Botao type="button" variante="fantasma" className="h-11" onClick={() => router.refresh()}>
      <IconeAtualizar className="h-4 w-4" />
      Atualizar
    </Botao>
  )
}
