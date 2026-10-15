/**
 * Grants dashboard access to an existing Supabase Auth user.
 *
 * There is no public registration. Create the user first (Supabase dashboard →
 * Authentication → Users → "Add user", with "Auto Confirm User" checked), then:
 *
 *   npm run admin:create -- --email jane@example.com --role admin --name "Jane Doe"
 *   npm run admin:create -- --email jane@example.com --deactivate
 *
 * Roles: owner | admin | staff. Re-running updates the role/name. See
 * docs/architecture/authentication.md#managing-admins.
 */
import { loadEnvFiles } from '../src/app/env-file.js'
import { parseArgs } from 'node:util'
import postgres from 'postgres'

loadEnvFiles()

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    role: { type: 'string', default: 'staff' },
    name: { type: 'string' },
    deactivate: { type: 'boolean', default: false },
  },
})

const roles = ['owner', 'admin', 'staff']
if (!values.email || !roles.includes(values.role!)) {
  console.error('Usage: npm run admin:create -- --email <email> [--role owner|admin|staff] [--name "Full Name"] [--deactivate]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: process.env.DATABASE_SSL === 'false' ? false : 'require' })

try {
  const [user] = await sql<{ id: string; email: string }[]>`
    select id, email from auth.users where lower(email) = lower(${values.email})
  `
  if (!user) {
    console.error(`No Supabase Auth user with email ${values.email}. Create the user in Supabase first.`)
    process.exitCode = 1
  } else {
    const [profile] = await sql<{ role: string; is_active: boolean }[]>`
      insert into admin_profiles (id, email, full_name, role, is_active)
      values (${user.id}, ${user.email}, ${values.name ?? ''}, ${values.role!}, ${!values.deactivate})
      on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(nullif(${values.name ?? ''}, ''), admin_profiles.full_name),
        role = excluded.role,
        is_active = excluded.is_active
      returning role, is_active
    `
    console.log(`${user.email}: role=${profile!.role} active=${profile!.is_active}`)
  }
} catch (error) {
  console.error('Failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
