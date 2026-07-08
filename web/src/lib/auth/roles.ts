import type { Perfil } from '@/types/domain'

export const PERFIS: Perfil[] = ['gestor', 'comercial', 'consultor']

export const ROTA_BASE_POR_PERFIL: Record<Perfil, string> = {
  gestor: '/gestor',
  comercial: '/comercial',
  consultor: '/consultor',
}

export function perfilPermiteRota(perfil: Perfil, pathname: string): boolean {
  if (perfil === 'gestor') return true // Gestor tem acesso total, inclusive às rotas de Comercial.
  return pathname.startsWith(ROTA_BASE_POR_PERFIL[perfil])
}
