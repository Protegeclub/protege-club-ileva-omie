import { logger, task } from '@trigger.dev/sdk/v3'
import { gerarESalvarApuracao } from '@/lib/apuracao/gerar'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface GerarApuracaoPayload {
  codConsultor: number
  ano: number
  mes: number
  geradoPorUserId: string
}

async function atualizarJob(
  payload: GerarApuracaoPayload,
  campos: Record<string, unknown>
) {
  const admin = createSupabaseAdminClient()
  await admin
    .from('apuracao_jobs')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq('cod_consultor', payload.codConsultor)
    .eq('ano', payload.ano)
    .eq('mes', payload.mes)
}

// Gera a apuração de UM consultor em segundo plano, fora do request/response da Vercel — é a
// mesma lógica de sempre (gerarESalvarApuracao), só que rodando aqui pra não esbarrar no timeout
// de função serverless (achado real do teste de stress: alguns consultores levam até 31min, ver
// CONTEXTO_E_CHECKLIST.md seção 6.7).
//
// concurrencyLimit: 1 é proposital — o token do Ileva só permite 1 sessão ativa por usuário, e
// cada execução desta tarefa roda no seu próprio processo isolado (o mutex em memória de
// web/src/lib/ileva/client.ts só protege dentro de UM processo). Rodar mais de uma ao mesmo tempo
// reintroduziria a cascata de 401 que já vimos e corrigimos localmente. Trocar por um cache de
// token compartilhado de verdade (tabela ileva_token_cache) é o próximo passo se a fila ficar
// lenta demais na prática.
export const gerarApuracaoTask = task({
  id: 'gerar-apuracao',
  maxDuration: 3600,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: GerarApuracaoPayload) => {
    await atualizarJob(payload, { status: 'processando' })

    try {
      const resultado = await gerarESalvarApuracao(
        payload.geradoPorUserId,
        payload.codConsultor,
        payload.ano,
        payload.mes
      )
      await atualizarJob(payload, { status: 'concluido', erro_mensagem: null })
      logger.log('Apuração gerada', {
        codConsultor: payload.codConsultor,
        totalLiquido: resultado.totalLiquido,
      })
      return resultado
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Erro desconhecido.'
      await atualizarJob(payload, { status: 'erro', erro_mensagem: mensagem })
      throw e
    }
  },
})
