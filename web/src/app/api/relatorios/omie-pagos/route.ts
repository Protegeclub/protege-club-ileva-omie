import { NextResponse, type NextRequest } from 'next/server'
import { buscarRelatorioPagosOmie, gerarCsvPagosOmie, normalizarDataFiltro } from '@/lib/omie/relatorio-pagos'
import { gerarPdfPagosOmie } from '@/lib/relatorios/omie-pagos'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Relatório "Consultores pagos via Omie" (tela /gestor/omie/pagos) em PDF ou CSV — mesmo período
// da tela (de/ate em AAAA-MM-DD, opcionais; formato=pdf|csv, padrão pdf). Só o Gestor pode
// chamar (mesma regra dos demais /api/relatorios).
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
  const de = normalizarDataFiltro(searchParams.get('de'))
  const ate = normalizarDataFiltro(searchParams.get('ate'))
  const formato = searchParams.get('formato') === 'csv' ? 'csv' : 'pdf'

  if (de && ate && de > ate) {
    return NextResponse.json({ erro: 'A data inicial não pode ser depois da data final.' }, { status: 400 })
  }

  try {
    const relatorio = await buscarRelatorioPagosOmie({ de, ate })
    const sufixo = de || ate ? `-${de ?? 'inicio'}-a-${ate ?? 'hoje'}` : '-todos'

    if (formato === 'csv') {
      return new NextResponse(gerarCsvPagosOmie(relatorio.pagamentos), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="consultores-pagos-omie${sufixo}.csv"`,
        },
      })
    }

    const pdf = await gerarPdfPagosOmie(relatorio, de, ate)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="consultores-pagos-omie${sufixo}.pdf"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Erro desconhecido.' }, { status: 500 })
  }
}
