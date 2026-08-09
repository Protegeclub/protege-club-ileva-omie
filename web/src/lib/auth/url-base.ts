import { headers } from 'next/headers'

// Prioriza NEXT_PUBLIC_SITE_URL (fixo, configurado no ambiente) sobre o header Origin da
// requisição — sem isso, um link de convite/recuperação de senha podia saber com o domínio que
// quem clicou o botão por acaso estava usando no navegador no momento (localhost durante um
// teste local, uma URL de preview de deploy etc.), o que quebrava o link pra quem recebia de
// verdade. Cai no Origin só como fallback de conveniência pra dev local, quando a variável não
// está configurada. Compartilhado entre o convite de acesso (gestor/acessos) e a recuperação de
// senha (login) — os dois precisam montar a mesma URL base pro link de `/definir-senha`.
export async function obterUrlBase(): Promise<string | undefined> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL
  if (configurada) return configurada.replace(/\/+$/, '')
  return (await headers()).get('origin') ?? undefined
}
