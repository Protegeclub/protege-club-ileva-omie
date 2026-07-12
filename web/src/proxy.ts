import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseProxyClient } from '@/lib/supabase/proxy'
import { ROTA_BASE_POR_PERFIL, perfilPermiteRota } from '@/lib/auth/roles'
import type { Perfil } from '@/types/domain'

// Renomeado de middleware.ts para proxy.ts no Next.js 16 (breaking change — ver
// node_modules/next/dist/docs/.../file-conventions/proxy.md). Faz duas coisas:
// 1. Redireciona quem não está logado para /login.
// 2. Bloqueia um perfil de acessar a área de outro (ex.: consultor tentando /gestor).
//
// Isso é a primeira linha de defesa, não a única: cada Server Action/Route Handler que toca
// dado sensível deve reconferir o perfil (RLS no Supabase + checagem explícita), porque o Next
// avisa que mudanças de rota podem silenciosamente deixar de passar pelo proxy.
// /definir-senha é onde cai o link de convite/redefinição de senha do Supabase. Nesse momento a
// sessão só existe no fragmento da URL (#access_token=...), que o servidor nunca vê — só o
// cliente no navegador consegue processar isso (ver src/app/definir-senha/page.tsx). Por isso
// essa rota tem que passar direto pelo proxy mesmo sem sessão visível aqui.
const ROTAS_PUBLICAS = ['/login', '/definir-senha']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, getResponse } = createSupabaseProxyClient(request)

  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    if (ROTAS_PUBLICAS.includes(pathname)) return getResponse()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (pathname === '/definir-senha') return getResponse()

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  const perfil = perfilRow?.perfil as Perfil | undefined

  if (!perfil) {
    // Usuário autenticado mas sem perfil cadastrado na tabela `perfis` — não deveria acontecer
    // em uso normal (o cadastro do usuário sempre cria o perfil). Ver seção 6.3 do checklist.
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('erro', 'perfil-nao-encontrado')
    return NextResponse.redirect(url)
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = ROTA_BASE_POR_PERFIL[perfil]
    return NextResponse.redirect(url)
  }

  // Rotas de API fazem a própria checagem de permissão dentro de cada Route Handler (ex.:
  // /api/relatorios/consultor deixa o próprio consultor baixar o dele, mas bloquearia outro
  // cod_consultor). A restrição de prefixo por perfil abaixo é pensada pra páginas
  // (/gestor, /consultor), não pra endpoints — sem essa exceção, um Consultor
  // batendo em /api/relatorios/* seria redirecionado antes de a rota rodar.
  if (pathname.startsWith('/api/')) return getResponse()

  if (!perfilPermiteRota(perfil, pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = ROTA_BASE_POR_PERFIL[perfil]
    return NextResponse.redirect(url)
  }

  return getResponse()
}

export const config = {
  // Também exclui arquivos estáticos de public/ (ex.: a logo em .png) — sem isso, o próprio
  // otimizador de imagem do Next busca esses arquivos sem cookie de sessão, cai no proxy e é
  // redirecionado pra /login, fazendo a imagem "quebrar" silenciosamente (bug real visto ao
  // adicionar a logo: a requisição virava um redirect em vez do arquivo).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
