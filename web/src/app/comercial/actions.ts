'use server'

import { revalidatePath } from 'next/cache'
import { apurarConsultorMes } from '@/lib/apuracao/mensal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface GerarApuracaoEstado {
  sucesso?: boolean
  erro?: string
  resumo?: { totalAdesao: number; totalRecorrencia: number }
}

export async function gerarApuracao(
  _estadoAnterior: GerarApuracaoEstado,
  formData: FormData
): Promise<GerarApuracaoEstado> {
  const supabase = await createSupabaseServerClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { erro: 'Sessão expirada, faça login novamente.' }
  }

  // Defesa em profundidade: reconfirma o perfil aqui, não confia só no proxy.ts (ver nota em
  // src/proxy.ts sobre o próprio Next.js avisar que isso pode ser contornado).
  const { data: perfilRow } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('user_id', userData.user.id)
    .single()

  if (!perfilRow || (perfilRow.perfil !== 'gestor' && perfilRow.perfil !== 'comercial')) {
    return { erro: 'Sem permissão para gerar apuração.' }
  }

  const codConsultor = Number(formData.get('cod_consultor'))
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))

  if (!codConsultor || !ano || !mes) {
    return { erro: 'Preencha consultor, ano e mês.' }
  }

  try {
    const resultado = await apurarConsultorMes(codConsultor, ano, mes)

    const admin = createSupabaseAdminClient()
    const { error } = await admin.from('apuracoes_mensais').upsert(
      {
        cod_consultor: codConsultor,
        ano,
        mes,
        total_adesao: resultado.totalAdesao,
        total_recorrencia: resultado.totalRecorrencia,
        total_desconto_rastreador: 0,
        total_premiacao_individual: 0,
        total_premiacao_equipe: 0,
        total_liquido: resultado.totalAdesao + resultado.totalRecorrencia,
        gerado_por: userData.user.id,
        gerado_em: new Date().toISOString(),
        detalhe: {
          adesoes: resultado.adesoes,
          recorrencias: resultado.recorrencias,
          veiculosComRastreador: resultado.veiculosComRastreador,
        },
      },
      { onConflict: 'cod_consultor,ano,mes' }
    )

    if (error) {
      return { erro: `Erro ao salvar no banco: ${error.message}` }
    }

    revalidatePath('/consultor')

    return {
      sucesso: true,
      resumo: { totalAdesao: resultado.totalAdesao, totalRecorrencia: resultado.totalRecorrencia },
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : 'Erro desconhecido ao gerar apuração.' }
  }
}
