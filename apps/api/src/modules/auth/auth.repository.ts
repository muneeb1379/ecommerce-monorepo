import type { Executor } from '../../lib/db.js'
import type { AdminProfile } from './auth.types.js'

export const authRepository = {
  async findAdminProfileById(sql: Executor, userId: string): Promise<AdminProfile | null> {
    const [row] = await sql<AdminProfile[]>`
      select id, email, full_name, role, avatar_url, is_active, created_at
      from admin_profiles
      where id = ${userId}
    `
    return row ?? null
  },
}

export type AuthRepository = typeof authRepository
