import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { Cartao } from '@/lib/ui/cartao'
import { Selo } from '@/lib/ui/selo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ConvidarButton } from './convidar-button'
import { ConvidarGestorForm } from './convidar-gestor-form'

// Gestão de acesso: consultores (quem já foi convidado, ligado ao cod_consultor do Ileva) e
// Gestores (mais de uma pessoa pode ter acesso total ao sistema — ver CONTEXTO_E_CHECKLIST.md
// sobre a unificação do painel Comercial dentro do Gestor). O convite usa o Supabase Auth
// (inviteUserByEmail) — ninguém, nem quem convida, fica sabendo a senha de ninguém; a própria
// pessoa define ao clicar no link do e-mail.
export default async function GestorAcessosPage() {
  const admin = createSupabaseAdminClient()

  const [consultores, { data: perfisConsultores }, { data: perfisGestores }] = await Promise.all([
    listarTodosConsultores(),
    admin.from('perfis').select('cod_consultor').eq('perfil', 'consultor'),
    admin.from('perfis').select('user_id, nome').eq('perfil', 'gestor'),
  ])

  const codsComAcesso = new Set((perfisConsultores ?? []).map((p) => p.cod_consultor))

  const linhas = consultores
    .filter((c) => c.situacao === 'Ativo')
    .sort((a, b) => Number(codsComAcesso.has(a.cod_consultor)) - Number(codsComAcesso.has(b.cod_consultor)))

  const semAcessoCount = linhas.filter((c) => !codsComAcesso.has(c.cod_consultor)).length

  const gestores = await Promise.all(
    (perfisGestores ?? []).map(async (g) => {
      const { data } = await admin.auth.admin.getUserById(g.user_id)
      return { nome: g.nome, email: data.user?.email ?? '—' }
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <Link href="/gestor/consultores" className="text-xs text-slate-400 hover:text-brand-navy hover:underline">
          ← Voltar para consultores
        </Link>
        <h2 className="text-base font-semibold text-slate-900">Acessos</h2>
      </div>

      <Cartao className="space-y-3 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Gestores com acesso</h3>
          <p className="text-sm text-slate-500">
            Mais de uma pessoa pode ter acesso total ao sistema (apuração, geração e acessos).
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Nome</th>
                <th className="px-3 py-1.5 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((g) => (
                <tr key={g.email} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-800">{g.nome}</td>
                  <td className="px-3 py-1.5 text-slate-500">{g.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ConvidarGestorForm />
      </Cartao>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Acesso dos consultores</h3>
        <p className="text-sm text-slate-500">
          {linhas.length - semAcessoCount} de {linhas.length} consultores ativos já têm acesso
          ao sistema.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                    <Selo>Tem acesso</Selo>
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
