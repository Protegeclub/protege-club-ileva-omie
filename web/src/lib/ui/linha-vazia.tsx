import { IconeCaixaVazia } from './icones-sidebar'

// Linha de "sem resultado" pras tabelas de relatório (Adesões/Recorrência/Rastreadores/Placas/
// Inadimplentes, Gestor + Consultor) — substitui o texto solto cinza por um estado desenhado
// (ícone + mensagem), igual ao resto do sistema já faz pra outros vazios (ex.: ranking do
// Dashboard). Só troca a apresentação da mesma mensagem — nenhum dado muda.
export function LinhaVazia({ colSpan, texto }: { colSpan: number; texto: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <IconeCaixaVazia className="h-8 w-8" />
          <p className="text-sm">{texto}</p>
        </div>
      </td>
    </tr>
  )
}
