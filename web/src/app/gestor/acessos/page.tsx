import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { Cartao } from '@/lib/ui/cartao'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { BotaoRemoverGestor } from './botao-remover-gestor'
import { ConvidarGestorForm } from './convidar-gestor-form'
import { TabelaAcessos, type LinhaAcesso, type StatusAcesso } from './tabela-acessos'

// Gestão de acesso: consultores (quem já foi convidado, ligado ao cod_consultor do Ileva) e
// Gestores (mais de uma pessoa pode ter acesso total ao sistema — ver CONTEXTO_E_CHECKLIST.md
// sobre a unificação do painel Comercial dentro do Gestor). O convite usa o Supabase Auth
// (inviteUserByEmail) — ninguém, nem quem convida, fica sabendo a senha de ninguém; a própria
// pessoa define ao clicar no link do e-mail.
export default async function GestorAcessosPage() {
  const admin = createSupabaseAdminClient()

  const [consultores, { data: perfisConsultores }, { data: perfisGestores }] = await Promise.all([
    listarTodosConsultores(),
    admin.from('perfis').select('cod_consultor, user_id').eq('perfil', 'consultor'),
    admin.from('perfis').select('user_id, nome').eq('perfil', 'gestor'),
  ])

  // Status real de cada consultor com perfil: "ativo" = já confirmou o e-mail (concluiu o
  // "Defina sua senha" ou já fez login); "pendente" = perfil existe mas ainda não confirmou.
  // Mesmo padrão já usado abaixo pra buscar os Gestores (Promise.all de getUserById).
  const usuariosConsultores = await Promise.all(
    (perfisConsultores ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.user_id)
      return { cod_consultor: p.cod_consultor as number, ativo: !!data.user?.email_confirmed_at }
    })
  )
  const statusPorCod = new Map(usuariosConsultores.map((u) => [u.cod_consultor, u.ativo]))

  const linhas: LinhaAcesso[] = consultores
    .filter((c) => c.situacao === 'Ativo')
    .map((consultor) => {
      const temAcesso = statusPorCod.has(consultor.cod_consultor)
      const status: StatusAcesso = !temAcesso
        ? 'nunca_convidado'
        : statusPorCod.get(consultor.cod_consultor)
          ? 'ativo'
          : 'pendente'
      return {
        cod_consultor: consultor.cod_consultor,
        nome: consultor.nome,
        email: consultor.email || '',
        equipe: consultor.equipe || '—',
        status,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const equipesDisponiveis = Array.from(new Set(linhas.map((l) => l.equipe))).sort((a, b) => a.localeCompare(b))

  const gestores = await Promise.all(
    (perfisGestores ?? []).map(async (g) => {
      const { data } = await admin.auth.admin.getUserById(g.user_id)
      return { userId: g.user_id, nome: g.nome, email: data.user?.email ?? '—' }
    })
  )

  const totalAtivos = linhas.filter((l) => l.status === 'ativo').length
  const totalPendentes = linhas.filter((l) => l.status === 'pendente').length
  const totalSemAcesso = linhas.filter((l) => l.status === 'nunca_convidado').length

  return (
    <div className="space-y-8">
      <div>
        <Link href="/gestor/consultores" className="text-xs text-slate-400 hover:text-brand-navy hover:underline">
          ← Voltar para consultores
        </Link>
        <h2 className="text-base font-semibold text-slate-900">Acessos</h2>
      </div>

      {/* Cards de resumo — contagens fixas (não reagem aos filtros da tabela abaixo), pro
          Gestor ter uma referência estável do total, igual ao resto do sistema. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <CardResumo titulo="Gestores" valor={gestores.length} />
        <CardResumo titulo="Consultores" valor={linhas.length} />
        <CardResumo titulo="Acessos ativos" valor={totalAtivos} tom="emerald" />
        <CardResumo titulo="Pendentes" valor={totalPendentes} tom="amber" />
        <CardResumo titulo="Sem acesso" valor={totalSemAcesso} tom="slate" />
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
                <th className="px-3 py-1.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((g) => (
                <tr key={g.userId} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-800">{g.nome}</td>
                  <td className="px-3 py-1.5 text-slate-500">{g.email}</td>
                  <td className="px-3 py-1.5">
                    <BotaoRemoverGestor userId={g.userId} nome={g.nome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ConvidarGestorForm />
      </Cartao>

      <TabelaAcessos linhas={linhas} equipesDisponiveis={equipesDisponiveis} />
    </div>
  )
}

function CardResumo({
  titulo,
  valor,
  tom = 'navy',
}: {
  titulo: string
  valor: number
  tom?: 'navy' | 'emerald' | 'amber' | 'slate'
}) {
  const cores: Record<string, string> = {
    navy: 'text-brand-navy',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    slate: 'text-slate-500',
  }
  return (
    <Cartao>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-semibold ${cores[tom]}`}>{valor}</p>
    </Cartao>
  )
}
