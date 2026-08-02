import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { LoginForm } from './login-form'

// Removido o rodapé de versão/ambiente do login por pedido do Samuel (02/08/2026) — essa
// informação continua real e visível em /gestor/configuracoes, só não faz mais sentido expor
// numa tela pública/sem autenticação.
//
// Server Component só pra checar, em disco, se o Samuel já colocou a arte institucional
// (public/images/login-left.png — ver DESIGN_SYSTEM.md) — enquanto ela não existir, não
// renderiza a tag <Image> (senão o navegador mostra o ícone de "imagem quebrada" no canto,
// já que o arquivo dá 404). Sem o asset, o painel esquerdo cai no fallback de cor sólida
// (bg-brand-navy), nunca numa composição tentando simular a arte.
export default function LoginPage() {
  const temArteFundo = existsSync(join(process.cwd(), 'public', 'images', 'login-left.png'))
  return <LoginForm temArteFundo={temArteFundo} />
}
