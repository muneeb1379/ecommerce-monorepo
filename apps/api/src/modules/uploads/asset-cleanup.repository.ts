import type { Executor } from '../../lib/db.js'

export interface PendingDeletion {
  id: string
  imagekitFileId: string
  attempts: number
}

export const assetCleanupRepository = {
  async enqueue(sql: Executor, fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return
    await sql`
      insert into pending_asset_deletions (imagekit_file_id)
      select unnest(${sql.array(fileIds)}::text[])
      on conflict (imagekit_file_id) do nothing
    `
  },

  /**
   * Claims due rows by pushing next_attempt_at forward (a lease), so several
   * API instances never process the same row at the same time.
   */
  async claimDue(sql: Executor, limit: number, leaseSeconds: number): Promise<PendingDeletion[]> {
    return sql<PendingDeletion[]>`
      update pending_asset_deletions d
      set next_attempt_at = now() + make_interval(secs => ${leaseSeconds})
      where d.id in (
        select id from pending_asset_deletions
        where next_attempt_at <= now()
        order by next_attempt_at
        limit ${limit}
        for update skip locked
      )
      returning d.id, d.imagekit_file_id, d.attempts
    `
  },

  async claimByFileIds(sql: Executor, fileIds: string[], leaseSeconds: number): Promise<PendingDeletion[]> {
    if (fileIds.length === 0) return []
    return sql<PendingDeletion[]>`
      update pending_asset_deletions d
      set next_attempt_at = now() + make_interval(secs => ${leaseSeconds})
      where d.id in (
        select id from pending_asset_deletions
        where imagekit_file_id = any(${sql.array(fileIds)}::text[])
        for update skip locked
      )
      returning d.id, d.imagekit_file_id, d.attempts
    `
  },

  async complete(sql: Executor, id: string): Promise<void> {
    await sql`delete from pending_asset_deletions where id = ${id}`
  },

  async fail(sql: Executor, id: string, error: string, retryInSeconds: number): Promise<void> {
    await sql`
      update pending_asset_deletions
      set attempts = attempts + 1,
          last_error = ${error.slice(0, 500)},
          next_attempt_at = now() + make_interval(secs => ${retryInSeconds})
      where id = ${id}
    `
  },
}

export type AssetCleanupRepository = typeof assetCleanupRepository
