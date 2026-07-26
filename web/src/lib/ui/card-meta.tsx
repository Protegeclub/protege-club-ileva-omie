import { Cartao } from './cartao'

// Card de meta do mês — a Protege Club ainda não definiu as regras do plano de carreira (mesmo
// motivo de Premiação Individual/Líder de equipe sempre saírem R$0,00 hoje), então não existe
// meta cadastrada nenhuma pra buscar. Mostra o placeholder explícito em vez de inventar um valor.
export function CardMeta() {
  return (
    <Cartao className="p-5">
      <p className="text-sm font-medium text-slate-700">Meta do mês</p>
      <p className="mt-3 text-sm text-slate-400">Meta ainda não definida.</p>
    </Cartao>
  )
}
