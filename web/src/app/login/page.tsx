import { env } from '@/lib/env'
import packageJson from '../../../package.json'
import { LoginForm } from './login-form'

// Server Component só pra ler versão/ambiente (dado real, não fabricado) e repassar pro Client
// Component — mesmo padrão de gestor/gerar/page.tsx (Server busca dado, Client cuida da UI).
export default function LoginPage() {
  return <LoginForm versao={packageJson.version} ambiente={env.ambiente} />
}
