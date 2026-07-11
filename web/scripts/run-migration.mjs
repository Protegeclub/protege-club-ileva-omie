// Aplica um arquivo de migration diretamente no Postgres do Supabase, sem precisar colar no
// SQL Editor do painel.
//
// Pré-requisito (não é dependência permanente do projeto, para não pesar o build do Vercel):
//   npm install --no-save pg
// Uso: node scripts/run-migration.mjs supabase/migrations/000X_nome.sql
//
// Lê SUPABASE_URL e SENHA_BANCO_DE_DADOS do .env na raiz do projeto (a senha do banco, definida
// na criação do projeto Supabase — diferente das chaves de API do .env.local).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const raizProjeto = path.resolve(fileURLToPath(import.meta.url), '../../../')
const envPath = path.join(raizProjeto, '.env')

const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

if (!env.SUPABASE_URL || !env.SENHA_BANCO_DE_DADOS) {
  throw new Error('SUPABASE_URL e SENHA_BANCO_DE_DADOS precisam estar preenchidos no .env')
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  throw new Error('Uso: node scripts/run-migration.mjs <caminho-do-arquivo.sql>')
}

const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0]
const connectionString = `postgresql://postgres:${encodeURIComponent(env.SENHA_BANCO_DE_DADOS)}@db.${projectRef}.supabase.co:5432/postgres`
const sql = readFileSync(sqlFile, 'utf-8')

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  console.log('Migration aplicada com sucesso:', sqlFile)
} finally {
  await client.end()
}
