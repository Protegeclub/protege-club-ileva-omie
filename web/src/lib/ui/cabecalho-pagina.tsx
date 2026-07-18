import { Botao } from './botao'

// Dedupe do header repetido nas 10 telas de relatório (5 do Consultor + 5 espelhadas no Gestor,
// confirmadas idênticas byte a byte antes desta mudança). "Voltar" é só navegação (baixa
// ênfase — fantasma); "Baixar PDF" é a única ação de valor de cada tela (alta ênfase — destaque,
// laranja).
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
      <Botao href={voltarHref} variante="fantasma">
        Voltar
      </Botao>
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {pdfHref ? (
        <Botao href={pdfHref} target="_blank" rel="noreferrer" variante="destaque">
          Baixar PDF
        </Botao>
      ) : (
        <div className="w-[88px]" aria-hidden />
      )}
    </div>
  )
}
