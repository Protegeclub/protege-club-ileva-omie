import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AdesaoItem, RecorrenciaItem, VeiculoRastreadorItem } from '@/lib/apuracao/mensal'

interface ApuracaoRow {
  ano: number
  mes: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_premiacao_individual: number
  total_premiacao_equipe: number
  total_liquido: number
  gerado_em: string
  detalhe: {
    adesoes?: AdesaoItem[]
    recorrencias?: RecorrenciaItem[]
    veiculosComRastreador?: VeiculoRastreadorItem[]
  }
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ConsultorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfis')
    .select('cod_consultor, nome')
    .eq('user_id', userData.user?.id ?? '')
    .single()

  if (!perfil?.cod_consultor) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Este usuário não está vinculado a um consultor do Ileva (campo <code>cod_consultor</code>{' '}
        vazio em <code>perfis</code>).
      </div>
    )
  }

  const { data: apuracao } = await supabase
    .from('apuracoes_mensais')
    .select(
      'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_liquido, gerado_em, detalhe'
    )
    .eq('cod_consultor', perfil.cod_consultor)
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle<ApuracaoRow>()

  if (!apuracao) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Apuração de {String(mes).padStart(2, '0')}/{ano} ainda não foi gerada para este
        consultor. Peça ao Comercial para gerar.
      </div>
    )
  }

  const adesoes = apuracao.detalhe?.adesoes ?? []
  const recorrencias = apuracao.detalhe?.recorrencias ?? []
  const rastreadores = apuracao.detalhe?.veiculosComRastreador ?? []

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Referência {String(apuracao.mes).padStart(2, '0')}/{apuracao.ano} — gerada em{' '}
        {new Date(apuracao.gerado_em).toLocaleString('pt-BR')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardComDetalhe titulo="Adesões no mês" valor={formatarMoeda(apuracao.total_adesao)}>
          {adesoes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma adesão paga neste mês.</p>
          ) : (
            <Tabela
              colunas={['Placa', 'Associado', 'Valor']}
              linhas={adesoes.map((a) => [a.placa, a.associado, formatarMoeda(a.valor)])}
            />
          )}
        </CardComDetalhe>

        <CardComDetalhe titulo="Recorrência do mês" valor={formatarMoeda(apuracao.total_recorrencia)}>
          {recorrencias.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma recorrência paga neste mês.</p>
          ) : (
            <Tabela
              colunas={['Placa', 'Valor']}
              linhas={recorrencias.map((r) => [r.placa, formatarMoeda(r.valor)])}
            />
          )}
        </CardComDetalhe>

        <CardComDetalhe
          titulo="Desconto de rastreador"
          valor={formatarMoeda(apuracao.total_desconto_rastreador)}
        >
          <p className="text-sm text-slate-400">
            Ainda não calculado automaticamente — falta confirmar com o cliente onde esse custo é
            lançado no Ileva ({rastreadores.length} veículo(s) com rastreador nesta carteira).
          </p>
        </CardComDetalhe>

        <CardComDetalhe
          titulo="Premiação (plano de carreira)"
          valor="—"
        >
          <p className="text-sm text-slate-400">
            Regras do plano de carreira ainda não definidas pelo cliente.
          </p>
        </CardComDetalhe>

        <CardComDetalhe titulo="Inadimplentes na carteira" valor="—">
          <p className="text-sm text-slate-400">Ainda não implementado.</p>
        </CardComDetalhe>
      </div>
    </div>
  )
}

function CardComDetalhe({
  titulo,
  valor,
  children,
}: {
  titulo: string
  valor: string
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white p-5 open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{valor}</p>
        </div>
        <span className="text-xs text-slate-400 group-open:hidden">ver detalhes</span>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </details>
  )
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-slate-400">
          {colunas.map((c) => (
            <th key={c} className="pb-2 font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => (
          <tr key={i} className="border-t border-slate-100">
            {linha.map((valor, j) => (
              <td key={j} className="py-1.5 text-slate-700">
                {valor}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
