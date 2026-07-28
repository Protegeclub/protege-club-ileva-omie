import { NextResponse, type NextRequest } from 'next/server'
import type { ApuracaoDetalhe } from '@/app/consultor/tipos'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { gerarPdfTodosConsultores, type ItemTodosConsultores } from '@/lib/relatorios/todos-consultores'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface ApuracaoRowResumo {
  cod_consultor: number
  total_adesao: number
  total_recorrencia: number
  total_desconto_rastreador: number
  total_liquido: number
  detalhe: ApuracaoDetalhe | null
}

// PDF em lote: todos os consultores ativos (opcionalmente filtrados por equipe e/ou busca por
// nome/código, os mesmos filtros já aplicados na tela /gestor), cada um em sua própria seção —
// ver web/src/lib/relatorios/todos-consultores.ts. Só o Gestor pode chamar isso (mesma regra do
// relatório consolidado existente).
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (perfilRow?.perfil !== 'gestor') {
    return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const ano = Number(searchParams.get('ano'))
  const mes = Number(searchParams.get('mes'))
  const equipe = (searchParams.get('equipe') ?? '').trim()
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()

  if (!ano || !mes) {
    return NextResponse.json({ erro: 'Informe ano e mes.' }, { status: 400 })
  }

  try {
    const consultores = (await listarTodosConsultores()).filter((c) => c.situacao === 'Ativo')
    const filtrados = consultores.filter((c) => {
      if (equipe && c.equipe !== equipe) return false
      if (q && !c.nome.toLowerCase().includes(q) && String(c.cod_consultor) !== q) return false
      return true
    })

    if (filtrados.length === 0) {
      return NextResponse.json({ erro: 'Nenhum consultor encontrado com os filtros informados.' }, { status: 404 })
    }

    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from('apuracoes_mensais')
      .select('cod_consultor, total_adesao, total_recorrencia, total_desconto_rastreador, total_liquido, detalhe')
      .eq('ano', ano)
      .eq('mes', mes)
      .in('cod_consultor', filtrados.map((c) => c.cod_consultor))

    const apuracaoPorConsultor = new Map(
      ((data ?? []) as ApuracaoRowResumo[]).map((a) => [a.cod_consultor, a])
    )

    const itens: ItemTodosConsultores[] = filtrados
      .map((c) => {
        const a = apuracaoPorConsultor.get(c.cod_consultor)
        return {
          cod_consultor: c.cod_consultor,
          nomeConsultor: c.nome,
          equipe: c.equipe,
          gerado: !!a,
          qtdAdesoes: a?.detalhe?.adesoes?.length ?? 0,
          qtdPlacasAtivadas: a?.detalhe?.placasAtivadas?.length ?? 0,
          qtdInadimplentes: a?.detalhe?.inadimplentes?.length ?? 0,
          totalAdesao: a?.total_adesao ?? 0,
          totalRecorrencia: a?.total_recorrencia ?? 0,
          totalDescontoRastreador: a?.total_desconto_rastreador ?? 0,
          totalLiquido: a?.total_liquido ?? 0,
          placasAtivadas: a?.detalhe?.placasAtivadas ?? [],
        }
      })
      .sort((x, y) => y.totalLiquido - x.totalLiquido)

    const pdf = await gerarPdfTodosConsultores(ano, mes, itens)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="apuracao-todos-consultores-${ano}-${mes}.pdf"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Erro desconhecido.' }, { status: 500 })
  }
}
