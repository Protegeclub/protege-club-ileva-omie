import { NextResponse, type NextRequest } from 'next/server'
import { montarRelatorioConsolidado } from '@/lib/relatorios/consolidado'
import { gerarPdfConsolidado } from '@/lib/relatorios/pdf'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Só o Gestor pode baixar o relatório consolidado (é dado financeiro de todos os consultores —
// ver docs/REQUISITOS.md seção 4). Reconfirma o perfil aqui mesmo com o proxy.ts já bloqueando
// a rota /gestor, pelo mesmo motivo explicado em src/proxy.ts: uma Route Handler não deve
// confiar só no proxy.
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
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { erro: 'Informe data_inicio e data_fim (formato AAAA-MM-DD).' },
      { status: 400 }
    )
  }

  try {
    const relatorio = await montarRelatorioConsolidado(dataInicio, dataFim)
    const pdf = await gerarPdfConsolidado(relatorio)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-consolidado-${dataInicio}-a-${dataFim}.pdf"`,
      },
    })
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'Erro desconhecido ao gerar o relatório.'
    return NextResponse.json({ erro: mensagem }, { status: 500 })
  }
}
