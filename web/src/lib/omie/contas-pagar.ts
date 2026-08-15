import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { incluirAnexo, incluirContaPagar } from './client'

export interface EnviarContaPagarParams {
  apuracaoId: string
  codConsultor: number
  codigoClienteOmie: number
  valor: number
  dataVencimento: string // formato DD/MM/AAAA (padrão Omie)
  dataEmissao?: string // último dia do mês apurado — ver actions.ts (calcularUltimoDiaMes)
  codigoCategoria: string
  idContaCorrente: number
  criadoPor: string
  // Relatório (dashboard completo, sem inadimplentes) a anexar ao título no Omie — opcional
  // porque uma falha ao montar o PDF não deve impedir o pagamento em si (ver actions.ts).
  anexo?: { conteudo: Buffer; nomeArquivo: string }
  // Chave PIX do consultor (ver lib/omie/client.ts) — preenche a forma de pagamento do título.
  chavePix?: string
}

// Único ponto do sistema que de fato cria um título a pagar real no Omie. Sempre:
// 1. Gera um codigo_integracao determinístico por apuração (apuracao-<apuracaoId>) — reprocessar
//    a mesma apuração nunca duplica o título.
// 2. Grava uma linha em auditoria_omie ANTES de chamar a Omie (status 'pendente'), pra nunca ter
//    uma chamada de escrita sem rastro, mesmo se o processo cair no meio.
// 3. Se já existe uma tentativa com status 'enviado' pro mesmo código, recusa (idempotência —
//    ver CONTEXTO_E_CHECKLIST.md seção 6.5).
// 4. Depois do título criado, tenta anexar o relatório — falha aqui NÃO desfaz nem marca o
//    envio como erro (o pagamento já existe de verdade no Omie); só registra em
//    anexo_status/anexo_erro pra auditoria.
export async function enviarContaPagar(p: EnviarContaPagarParams): Promise<{
  codigo_lancamento_omie: number
  codigo_lancamento_integracao: string
}> {
  const admin = createSupabaseAdminClient()
  const codigoIntegracao = `apuracao-${p.apuracaoId}`

  const { data: existente } = await admin
    .from('auditoria_omie')
    .select('id, status')
    .eq('codigo_integracao', codigoIntegracao)
    .maybeSingle()

  if (existente?.status === 'enviado') {
    throw new Error('Este título já foi enviado ao Omie anteriormente para esta apuração.')
  }

  const { data: registro, error: erroUpsert } = await admin
    .from('auditoria_omie')
    .upsert(
      {
        apuracao_id: p.apuracaoId,
        cod_consultor: p.codConsultor,
        codigo_integracao: codigoIntegracao,
        valor: p.valor,
        status: 'pendente',
        criado_por: p.criadoPor,
      },
      { onConflict: 'codigo_integracao' }
    )
    .select('id')
    .single()

  if (erroUpsert || !registro) {
    throw new Error(`Erro ao registrar tentativa de envio: ${erroUpsert?.message}`)
  }

  try {
    const resposta = await incluirContaPagar({
      codigoClienteOmie: p.codigoClienteOmie,
      valor: p.valor,
      dataVencimento: p.dataVencimento,
      dataEmissao: p.dataEmissao,
      codigoCategoria: p.codigoCategoria,
      idContaCorrente: p.idContaCorrente,
      codigoLancamentoIntegracao: codigoIntegracao,
      observacao: `Comissão consultor #${p.codConsultor} — ProtegeClub`,
      chavePix: p.chavePix,
    })

    await admin.from('auditoria_omie').update({ status: 'enviado', retorno_omie: resposta }).eq('id', registro.id)

    if (p.anexo) {
      try {
        // cCodIntAnexo tem limite de 20 caracteres na Omie (erro real em produção, 12/08/2026:
        // `${codigoIntegracao}-anexo`, com o uuid da apuração, tinha 51 e sempre falhava, mesmo
        // com o pagamento já criado com sucesso). codigo_lancamento_omie (numérico, gerado pela
        // própria Omie) já é único por título, então "anexo-<id>" cabe com folga.
        await incluirAnexo({
          cCodIntAnexo: `anexo-${resposta.codigo_lancamento_omie}`,
          cTabela: 'conta-pagar',
          nId: resposta.codigo_lancamento_omie,
          cNomeArquivo: p.anexo.nomeArquivo,
          cTipoArquivo: 'pdf',
          conteudo: p.anexo.conteudo,
        })
        await admin.from('auditoria_omie').update({ anexo_status: 'enviado' }).eq('id', registro.id)
      } catch (e) {
        const mensagemAnexo = e instanceof Error ? e.message : String(e)
        await admin
          .from('auditoria_omie')
          .update({ anexo_status: 'erro', anexo_erro: mensagemAnexo })
          .eq('id', registro.id)
      }
    }

    return { codigo_lancamento_omie: resposta.codigo_lancamento_omie, codigo_lancamento_integracao: codigoIntegracao }
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e)
    await admin
      .from('auditoria_omie')
      .update({ status: 'erro', retorno_omie: { erro: mensagem } })
      .eq('id', registro.id)
    throw e
  }
}
