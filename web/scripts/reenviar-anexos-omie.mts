// Script de reparo pontual (não faz parte do app) — reenvia só o ANEXO (não o pagamento, que já
// existe) dos títulos que foram criados com sucesso no Omie antes da correção do limite de 20
// caracteres em cCodIntAnexo (12/08/2026, ver lib/omie/contas-pagar.ts).
import { readFileSync } from 'node:fs'

for (const linha of readFileSync('.env.local', 'utf-8').split('\n')) {
  const l = linha.trim()
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const idx = l.indexOf('=')
  process.env[l.slice(0, idx).trim()] = l.slice(idx + 1).trim()
}

const { createSupabaseAdminClient } = await import('../src/lib/supabase/admin.ts')
const { incluirAnexo } = await import('../src/lib/omie/client.ts')
const { gerarPdfDashboard } = await import('../src/lib/relatorios/consultor.ts')

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const admin = createSupabaseAdminClient()

// Uso: npx tsx scripts/reenviar-anexos-omie.mts [limite] — ex.: "1" pra testar só um antes de
// rodar todos os pendentes.
const limite = Number(process.argv[2]) || undefined

const { data: todosPendentes, error } = await admin
  .from('auditoria_omie')
  .select('id, apuracao_id, cod_consultor, retorno_omie')
  .eq('status', 'enviado')
  .eq('anexo_status', 'erro')

if (error) throw new Error(error.message)
const pendentes = limite ? (todosPendentes ?? []).slice(0, limite) : todosPendentes
console.log(`Encontrados ${todosPendentes?.length ?? 0} títulos sem anexo — processando ${pendentes?.length ?? 0}.\n`)

for (const item of pendentes ?? []) {
  const codigoLancamentoOmie = (item.retorno_omie as { codigo_lancamento_omie?: number } | null)?.codigo_lancamento_omie
  if (!codigoLancamentoOmie) {
    console.log(`#${item.cod_consultor}: sem codigo_lancamento_omie salvo em retorno_omie, pulando.`)
    continue
  }

  const { data: apuracao } = await admin
    .from('apuracoes_mensais')
    .select(
      'ano, mes, total_adesao, total_recorrencia, total_desconto_rastreador, total_premiacao_individual, total_premiacao_equipe, total_comissao_gerencial, total_bonus_nivel, detalhe'
    )
    .eq('id', item.apuracao_id)
    .maybeSingle()

  if (!apuracao) {
    console.log(`#${item.cod_consultor}: apuração ${item.apuracao_id} não encontrada, pulando.`)
    continue
  }

  const nomeConsultor = apuracao.detalhe?.nomeConsultor ?? `Consultor #${item.cod_consultor}`

  try {
    const pdf = await gerarPdfDashboard(
      nomeConsultor,
      apuracao.ano,
      apuracao.mes,
      {
        totalAdesoes: apuracao.detalhe?.adesoes?.length ?? 0,
        totalEquipe: 0,
        totalPremiacaoIndividual: apuracao.total_premiacao_individual,
        totalPremiacaoEquipe: apuracao.total_premiacao_equipe,
        totalAdesao: apuracao.total_adesao,
        totalRecorrencia: apuracao.total_recorrencia,
        totalDescontoRastreador: apuracao.total_desconto_rastreador,
        totalComissaoGerencial: apuracao.total_comissao_gerencial,
        totalBonusNivel: apuracao.total_bonus_nivel,
      },
      {
        adesoes: apuracao.detalhe?.adesoes ?? [],
        recorrencias: apuracao.detalhe?.recorrencias ?? [],
        descontosRastreador: apuracao.detalhe?.descontosRastreador ?? [],
        placasAtivadas: apuracao.detalhe?.placasAtivadas ?? [],
        inadimplentes: [],
        totalRecorrenciaEstimadaInadimplentes: 0,
      },
      { incluirInadimplentes: false }
    )

    await incluirAnexo({
      cCodIntAnexo: `anexo-${codigoLancamentoOmie}`,
      cTabela: 'conta-pagar',
      nId: codigoLancamentoOmie,
      cNomeArquivo: `relatorio-consultor-${item.cod_consultor}-${apuracao.ano}-${apuracao.mes}.pdf`,
      cTipoArquivo: 'pdf',
      conteudo: pdf,
    })

    await admin.from('auditoria_omie').update({ anexo_status: 'enviado', anexo_erro: null }).eq('id', item.id)
    console.log(`#${item.cod_consultor} (lançamento ${codigoLancamentoOmie}): anexo enviado com sucesso.`)
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e)
    await admin.from('auditoria_omie').update({ anexo_status: 'erro', anexo_erro: mensagem }).eq('id', item.id)
    console.log(`#${item.cod_consultor} (lançamento ${codigoLancamentoOmie}): ERRO — ${mensagem}`)
  }

  await esperar(1500)
}

console.log('\nConcluído.')
