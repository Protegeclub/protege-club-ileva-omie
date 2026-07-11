import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ConvidarButton } from './convidar-button'

// Gestão de acesso dos consultores: quem já foi convidado (tem linha em `perfis`) e quem ainda
// não. O convite usa o Supabase Auth (inviteUserByEmail) — ninguém, nem o Gestor, fica sabendo
// a senha de ninguém; o próprio consultor define ao clicar no link do e-mail.
export default async function GestorAcessosPage() {
  const admin = createSupabaseAdminClient()

  const [consultores, { data: perfis }] = await Promise.all([
    listarTodosConsultores(),
    admin.from('perfis').select('cod_consultor').eq('perfil', 'consultor'),
  ])

  const codsComAcesso = new Set((perfis ?? []).map((p) => p.cod_consultor))

  const linhas = consultores
    .filter((c) => c.situacao === 'Ativo')
    .sort((a, b) => Number(codsComAcesso.has(a.cod_consultor)) - Number(codsComAcesso.has(b.cod_consultor)))

  const semAcessoCount = linhas.filter((c) => !codsComAcesso.has(c.cod_consultor)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/gestor" className="text-xs text-slate-400 hover:underline">
            ← Voltar para a apuração
          </Link>
          <h2 className="text-base font-semibold text-slate-900">Acesso dos consultores</h2>
          <p className="text-sm text-slate-500">
            {linhas.length - semAcessoCount} de {linhas.length} consultores ativos já têm acesso
            ao sistema.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Consultor</th>
              <th className="px-4 py-2 font-medium">E-mail (Ileva)</th>
              <th className="px-4 py-2 font-medium">Acesso</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((consultor) => (
              <tr key={consultor.cod_consultor} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {consultor.nome} <span className="text-slate-400">#{consultor.cod_consultor}</span>
                </td>
                <td className="px-4 py-2 text-slate-500">{consultor.email || '—'}</td>
                <td className="px-4 py-2">
                  {codsComAcesso.has(consultor.cod_consultor) ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Tem acesso
                    </span>
                  ) : (
                    <ConvidarButton codConsultor={consultor.cod_consultor} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
