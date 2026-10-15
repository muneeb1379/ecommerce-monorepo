/**
 * Loads development sample data (db/seed.sql): categories and draft products
 * with colors. Images are not seeded because they must exist in your ImageKit
 * account; upload them through the admin dashboard.
 *
 *   npm run db:seed
 *
 * Refuses to run when NODE_ENV=production. Safe to re-run (upserts by slug).
 */
import { readFileSync } from 'node:fs'
import { loadEnvFiles } from '../src/app/env-file.js'
import { join } from 'node:path'
import postgres from 'postgres'

loadEnvFiles()

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: process.env.DATABASE_SSL === 'false' ? false : 'require', onnotice: () => {} })

try {
  await sql.begin((tx) => tx.unsafe(readFileSync(join(import.meta.dirname, '..', 'db', 'seed.sql'), 'utf8')))
  console.log('Seed data loaded.')
} catch (error) {
  console.error('Seeding failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
