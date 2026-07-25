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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/gestor/consultores" className="text-xs text-slate-400 hover:text-brand-navy hover:underline">
          ← Voltar para consultores
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-brand-navy">Gerar apuração</h1>
        <p className="text-sm text-slate-500">
          Calcula a comissão de um consultor (ou de todos) direto na API do Ileva e salva o
          resultado. Roda em segundo plano — pode fechar a aba a qualquer momento.
        </p>
      </div>

      <GerarApuracaoForm />
      <GerarLoteForm consultores={consultores} />
    </div>
  )
}
