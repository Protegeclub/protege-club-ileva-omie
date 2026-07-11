// Script de verificação manual (não faz parte do app) — testa a função real de apuração contra
// a API do Ileva, sem precisar subir o Next.js nem simular login.
//
// Pré-requisito (não é dependência permanente do projeto, para não pesar o build do Vercel):
//   npm install --no-save tsx
// Uso: npx tsx scripts/test-apuracao.mts <cod_consultor> <ano> <mes>
import { readFileSync } from 'node:fs'

for (const linha of readFileSync('.env.local', 'utf-8').split('\n')) {
  const l = linha.trim()
  if (!l || l.startsWith('#') || !l.includes('=')) continue
  const idx = l.indexOf('=')
  process.env[l.slice(0, idx).trim()] = l.slice(idx + 1).trim()
}

const { apurarConsultorMes } = await import('../src/lib/apuracao/mensal.ts')

const [codConsultorArg, anoArg, mesArg] = process.argv.slice(2)

const resultado = await apurarConsultorMes(Number(codConsultorArg), Number(anoArg), Number(mesArg))

console.log(JSON.stringify(resultado, null, 2))
