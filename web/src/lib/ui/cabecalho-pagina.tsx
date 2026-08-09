import Link from 'next/link'
import { Botao } from './botao'

// Dedupe do header repetido nas 10 telas de relatório (5 do Consultor + 5 espelhadas no Gestor).
// Título sempre à esquerda, grande e na cor de marca (mesmo peso visual do título das telas
// principais — Dashboard, Gerar etc.) — antes vinha centralizado e pequeno, um padrão só dessas
// 10 telas, diferente do resto do app. O link de volta usa texto discreto (não mais um botão com
// borda) e um rótulo específico ("ao resumo") pra não competir/confundir com o "← Voltar para
// consultores" da barra de filtro acima dele no lado Gestor — os dois vão pra lugares diferentes
// (resumo deste consultor vs. lista completa), mas com o rótulo genérico "Voltar" nos dois,
// pareciam a mesma ação duplicada. "Baixar PDF" continua a única ação de destaque (laranja).
export function CabecalhoPagina({
  titulo,
  voltarHref,
  pdfHref,
}: {
  titulo: string
  voltarHref: string
  pdfHref?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Link href={voltarHref} className="text-xs text-slate-400 hover:text-brand-navy hover:underline">
          ← Voltar ao resumo
        </Link>
        <h2 className="mt-0.5 text-xl font-bold text-brand-navy">{titulo}</h2>
      </div>
      {pdfHref && (
        <Botao href={pdfHref} target="_blank" rel="noreferrer" variante="destaque" className="shrink-0">
          Baixar PDF
        </Botao>
      )}
    </div>
  )
}
