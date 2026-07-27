function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada. Preencha web/.env.local (veja docs/api-ileva/COMO_GERAR_CHAVE_API.md e docs/PROPOSTA_COMERCIAL.md na raiz do projeto).`
    )
  }
  return value
}

export const env = {
  // 'production'/'preview' vêm do Vercel (VERCEL_ENV); fora do Vercel (ex.: `npm run build`
  // local) cai no NODE_ENV padrão do Next. Usado só pra exibir na tela de login — nunca pra
  // decisão de negócio.
  get ambiente(): 'Produção' | 'Homologação' | 'Desenvolvimento' {
    if (process.env.VERCEL_ENV === 'production') return 'Produção'
    if (process.env.VERCEL_ENV === 'preview') return 'Homologação'
    return process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'
  },
  supabase: {
    get url() {
      return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
    },
    get anonKey() {
      return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    },
    get serviceRoleKey() {
      return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
  },
  ileva: {
    get baseUrl() {
      return required('ILEVA_API_BASE_URL', process.env.ILEVA_API_BASE_URL)
    },
    get appKey() {
      return required('ILEVA_APP_KEY', process.env.ILEVA_APP_KEY)
    },
    get username() {
      return required('ILEVA_API_USERNAME', process.env.ILEVA_API_USERNAME)
    },
    get password() {
      return required('ILEVA_API_PASSWORD', process.env.ILEVA_API_PASSWORD)
    },
  },
  omie: {
    get baseUrl() {
      return required('OMIE_API_BASE_URL', process.env.OMIE_API_BASE_URL)
    },
    get appKey() {
      return required('OMIE_APP_KEY', process.env.OMIE_APP_KEY)
    },
    get appSecret() {
      return required('OMIE_APP_SECRET', process.env.OMIE_APP_SECRET)
    },
  },
}
