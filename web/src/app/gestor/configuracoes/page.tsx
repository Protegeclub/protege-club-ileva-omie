import packageJson from '../../../../package.json'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { env } from '@/lib/env'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CardAtalho } from '@/lib/ui/card-atalho'
import { Cartao, CartaoCabecalho } from '@/lib/ui/cartao'
import { CartaoMinhaConta } from '@/lib/ui/cartao-minha-conta'
import { IconeCarteira, IconeConfiguracoes, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { IconeCamadas, IconeSinal } from '../gerar/icones'

async function buscarUsuarioCompleto() {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfil) return null
  return { nome: perfil.nome, perfil: perfil.perfil, email: userData.user.email ?? '—' }
}

async function verificarIlevaOnline() {
  try {
    await listarTodosConsultores()
    return true
  } catch {
    return false
  }
}

const CORES_AMBIENTE: Record<string, string> = {
  Produção: 'bg-emerald-50 text-emerald-700',
  Homologação: 'bg-amber-50 text-amber-700',
  Desenvolvimento: 'bg-slate-100 text-slate-500',
}

export default async function GestorConfiguracoesPage() {
  const admin = createSupabaseAdminClient()

  const [usuario, ilevaOnline, { data: omieConfig }] = await Promise.all([
    buscarUsuarioCompleto(),
    verificarIlevaOnline(),
    admin.from('omie_configuracao').select('*').eq('id', 1).maybeSingle(),
  ])

  if (!usuario) {
    return <p className="text-sm text-red-600">Sessão expirada. Faça login novamente.</p>
  }

  const omieConfigurado = !!omieConfig?.codigo_categoria && !!omieConfig?.codigo_conta_corrente

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Sua conta, integrações e informações do sistema.</p>
      </div>

      <CartaoMinhaConta nomeAtual={usuario.nome} email={usuario.email} perfil={usuario.perfil} />

      <Cartao className="p-5">
        <CartaoCabecalho icone={<IconeCamadas className="h-5 w-5" />} titulo="Integrações" descricao="Status das conexões externas" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2.5">
              <IconeSinal className={`h-4 w-4 ${ilevaOnline ? 'text-emerald-500' : 'text-red-500'}`} />
              <div>
                <p className="text-sm font-medium text-slate-800">Ileva</p>
                <p className="text-xs text-slate-400">Fonte de dados de comissão</p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                ilevaOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {ilevaOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <CardAtalho
            href="/gestor/omie"
            icone={<IconeCarteira />}
            titulo="Omie"
            descricao={
              omieConfigurado
                ? `Configurado — ${omieConfig?.descricao_categoria} · ${omieConfig?.descricao_conta_corrente}`
                : 'Ainda não configurado — categoria e conta corrente'
            }
          />
        </div>
      </Cartao>

      <CardAtalho
        href="/gestor/acessos"
        icone={<IconeUsuarios />}
        titulo="Gestão de acessos"
        descricao="Convidar ou remover login de Gestores e Consultores"
      />

      <Cartao className="p-5">
        <CartaoCabecalho icone={<IconeConfiguracoes className="h-5 w-5" />} titulo="Sobre o sistema" />
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Versão</p>
            <p className="font-medium text-slate-700">{packageJson.version}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Ambiente</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES_AMBIENTE[env.ambiente] ?? 'bg-slate-100 text-slate-500'}`}>
              {env.ambiente}
            </span>
          </div>
        </div>
      </Cartao>
    </div>
  )
}
