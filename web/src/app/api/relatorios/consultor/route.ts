import { NextResponse, type NextRequest } from 'next/server'
import type { ApuracaoRow } from '@/app/consultor/tipos'
import { buscarConsultor } from '@/lib/ileva/api'
import {
  gerarPdfAdesoes,
  gerarPdfDashboard,
  gerarPdfInadimplentes,
  gerarPdfRastreadores,
  gerarPdfRecorrencia,
} from '@/lib/relatorios/consultor'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function responderPdf(pdf: Buffer, nomeArquivo: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}.pdf"`,
    },
  })
}

// Serve o PDF de qualquer uma das 5 telas do consultor (dashboard + 4 detalhes). O próprio
// consultor só pode baixar o seu; o Gestor pode baixar de qualquer um (mesma regra de acesso do
// resto do sistema).
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil, cod_consultor')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfilRow) {
    return NextResponse.json({ erro: 'Perfil não encontrado.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const codConsultor = Number(searchParams.get('cod_consultor'))
  const podeVerOutros = perfilRow.perfil === 'gestor'

  if (!codConsultor || (!podeVerOutros && perfilRow.cod_consultor !== codConsultor)) {
    return NextResponse.json({ erro: 'Sem permissão para ver dados deste consultor.' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()

  try {
    if (tipo === 'inadimplentes') {
      const { data: linha } = await admin
        .from('apuracoes_mensais')
        .select('ano, mes, detalhe')
        .eq('cod_consultor', codConsultor)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
        .limit(1)
        .maybeSingle<Pick<ApuracaoRow, 'ano' | 'mes' | 'detalhe'>>()

      const nomeConsultor = linha?.detalhe?.nomeConsultor ?? `Consultor #${codConsultor}`
      const itens = linha?.detalhe?.inadimplentes ?? []
      const totalEstimado = linha?.detalhe?.totalRecorrenciaEstimadaInadimplentes ?? 0
      const pdf = await gerarPdfInadimplentes(nomeConsultor, itens, totalEstimado)
      return responderPdf(pdf, `inadimplentes-${codConsultor}`)
    }

    const ano = Number(searchParams.get('ano'))
    const mes = Number(searchParams.get('mes'))
    const equipeAtiva = searchParams.get('equipe') === '1'
    if (!ano || !mes) {
      return NextResponse.json({ erro: 'Informe ano e mes.' }, { status: 400 })
    }

    const { data: linhaPropria } = await admin
      .from('apuracoes_mensais')
      .select(
        'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_liquido, cod_equipe, gerado_em, detalhe'
      )
      .eq('cod_consultor', codConsultor)
      .eq('ano', ano)
      .eq('mes', mes)
      .maybeSingle<ApuracaoRow>()

    if (!linhaPropria) {
      return NextResponse.json({ erro: 'Apuração ainda não gerada para este período.' }, { status: 404 })
    }

    const nomeConsultor = linhaPropria.detalhe?.nomeConsultor ?? `Consultor #${codConsultor}`

    let linhasEquipe: ApuracaoRow[] = [linhaPropria]
    if (equipeAtiva) {
      const { consultor } = await buscarConsultor({ cod_consultor: codConsultor })
      const { data } = await admin
        .from('apuracoes_mensais')
        .select(
          'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_liquido, cod_equipe, gerado_em, detalhe'
        )
        .eq('cod_equipe', consultor.cod_equipe)
        .eq('ano', ano)
        .eq('mes', mes)
      linhasEquipe = (data ?? []) as ApuracaoRow[]
    }

    if (tipo === 'dashboard') {
      const totalAdesoes = linhaPropria.detalhe?.adesoes?.length ?? 0
      const totalEquipe =
        linhasEquipe
          .filter((l) => l.cod_equipe === linhaPropria.cod_equipe)
          .reduce((soma, l) => soma + (l.detalhe?.adesoes?.length ?? 0), 0) - totalAdesoes

      const pdf = await gerarPdfDashboard(nomeConsultor, ano, mes, {
        totalAdesoes,
        totalEquipe: Math.max(totalEquipe, 0),
        totalPremiacaoIndividual: linhaPropria.total_premiacao_individual,
        totalPremiacaoEquipe: linhaPropria.total_premiacao_equipe,
        totalAdesao: linhaPropria.total_adesao,
        totalRecorrencia: linhaPropria.total_recorrencia,
        totalDescontoRastreador: linhaPropria.total_desconto_rastreador,
      })
      return responderPdf(pdf, `apuracao-${codConsultor}-${ano}-${mes}`)
    }

    if (tipo === 'adesoes') {
      const itens = linhasEquipe.flatMap((l) => l.detalhe?.adesoes ?? [])
      const pdf = await gerarPdfAdesoes(nomeConsultor, ano, mes, itens)
      return responderPdf(pdf, `adesoes-${codConsultor}-${ano}-${mes}`)
    }

    if (tipo === 'recorrencia') {
      const itens = linhasEquipe.flatMap((l) => l.detalhe?.recorrencias ?? [])
      const pdf = await gerarPdfRecorrencia(nomeConsultor, ano, mes, itens)
      return responderPdf(pdf, `recorrencia-${codConsultor}-${ano}-${mes}`)
    }

    if (tipo === 'rastreadores') {
      const itens = linhasEquipe.flatMap((l) => l.detalhe?.descontosRastreador ?? [])
      const pdf = await gerarPdfRastreadores(nomeConsultor, ano, mes, itens)
      return responderPdf(pdf, `rastreadores-${codConsultor}-${ano}-${mes}`)
    }

    return NextResponse.json({ erro: 'Tipo de relatório desconhecido.' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Erro desconhecido.' }, { status: 500 })
  }
}
