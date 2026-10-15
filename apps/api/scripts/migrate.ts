/**
 * Applies SQL migrations from db/migrations in filename order. Each file runs
 * in its own transaction and is recorded in public.schema_migrations.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --status list applied / pending
 *
 * Needs DATABASE_URL (a role that owns the schema, e.g. the Supabase
 * `postgres` user through the session pooler or a direct connection).
 * Rules for writing migrations: docs/development/contributing.md#migrations
 */
import { readdirSync, readFileSync } from 'node:fs'
import { loadEnvFiles } from '../src/app/env-file.js'
import { join } from 'node:path'
import postgres from 'postgres'

loadEnvFiles()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const dir = join(import.meta.dirname, '..', 'db', 'migrations')
const statusOnly = process.argv.includes('--status')
const sql = postgres(url, { max: 1, ssl: process.env.DATABASE_SSL === 'false' ? false : 'require', onnotice: () => {} })

try {
  await sql`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const applied = new Set((await sql<{ version: string }[]>`select version from public.schema_migrations`).map((r) => r.version))
  const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort()
  const pending = files.filter((file) => !applied.has(file))

  if (statusOnly) {
    for (const file of files) console.log(`${applied.has(file) ? 'applied ' : 'pending '} ${file}`)
  } else if (pending.length === 0) {
    console.log('Database is up to date.')
  } else {
    for (const file of pending) {
      const body = readFileSync(join(dir, file), 'utf8')
      await sql.begin(async (tx) => {
        await tx.unsafe(body)
        await tx`insert into public.schema_migrations (version) values (${file})`
      })
      console.log(`applied  ${file}`)
    }
  }
} catch (error) {
  console.error('Migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
