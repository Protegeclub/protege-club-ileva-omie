import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { incluirContaPagar } from './client'

export interface EnviarContaPagarParams {
  apuracaoId: string
  codConsultor: number
  codigoClienteOmie: number
  valor: number
  dataVencimento: string // formato DD/MM/AAAA (padrão Omie)
  codigoCategoria: string
  idContaCorrente: number
  criadoPor: string
}

// Único ponto do sistema que de fato cria um título a pagar real no Omie. Sempre:
// 1. Gera um codigo_integracao determinístico por apuração (apuracao-<apuracaoId>) — reprocessar
//    a mesma apuração nunca duplica o título.
// 2. Grava uma linha em auditoria_omie ANTES de chamar a Omie (status 'pendente'), pra nunca ter
//    uma chamada de escrita sem rastro, mesmo se o processo cair no meio.
// 3. Se já existe uma tentativa com status 'enviado' pro mesmo código, recusa (idempotência —
//    ver CONTEXTO_E_CHECKLIST.md seção 6.5).
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
      codigoCategoria: p.codigoCategoria,
      idContaCorrente: p.idContaCorrente,
      codigoLancamentoIntegracao: codigoIntegracao,
      observacao: `Comissão consultor #${p.codConsultor} — Protege Club`,
    })

    await admin.from('auditoria_omie').update({ status: 'enviado', retorno_omie: resposta }).eq('id', registro.id)

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
