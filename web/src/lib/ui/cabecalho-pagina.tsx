import { Botao } from './botao'

// Dedupe do header repetido nas 10 telas de relatório (5 do Consultor + 5 espelhadas no Gestor).
// Título sempre à esquerda, grande e na cor de marca (mesmo peso visual do título das telas
// principais — Dashboard, Gerar etc.) — antes vinha centralizado e pequeno, um padrão só dessas
// 10 telas, diferente do resto do app. O "Baixar PDF" que existia aqui saiu — todo PDF agora sai
// de /gestor/relatorios (página única).
export function CabecalhoPagina({ titulo, voltarHref }: { titulo: string; voltarHref: string }) {
  return (
    <div>
      <Botao href={voltarHref} variante="fantasma" tamanho="sm" className="mb-2">
        ← Voltar ao resumo
      </Botao>
      <h2 className="text-xl font-bold text-brand-navy">{titulo}</h2>
    </div>
  )
}
