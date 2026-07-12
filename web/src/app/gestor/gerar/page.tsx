import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { GerarApuracaoForm } from './gerar-apuracao-form'
import { GerarLoteForm } from './gerar-lote-form'

export default async function GestorGerarPage() {
  const consultores = (await listarTodosConsultores())
    .filter((c) => c.situacao === 'Ativo')
    .map((c) => ({ cod_consultor: c.cod_consultor, nome: c.nome, equipe: c.equipe }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <div className="space-y-8">
      <Link href="/gestor" className="text-xs text-slate-400 hover:underline">
        ← Voltar para a apuração
      </Link>

      <div>
        <h2 className="text-base font-semibold text-slate-900">Gerar apuração mensal</h2>
        <p className="text-sm text-slate-500">
          Busca os dados no Ileva e calcula adesão + recorrência do consultor no mês informado.
        </p>
        <div className="mt-4">
          <GerarApuracaoForm />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Gerar em lote (todos os consultores ativos)
        </h2>
        <p className="text-sm text-slate-500">
          Gera a apuração dos {consultores.length} consultores ativos de uma vez, um por um.
          Pode demorar vários minutos — não feche esta aba enquanto estiver rodando. Quem falhar
          pode ser tentado de novo sem repetir o lote inteiro.
        </p>
        <div className="mt-4">
          <GerarLoteForm consultores={consultores} />
        </div>
      </div>
    </div>
  )
}
