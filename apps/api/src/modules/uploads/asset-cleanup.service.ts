import type { FastifyBaseLogger } from 'fastify'
import type { Database, Executor } from '../../lib/db.js'
import type { ImageKitClient } from '../../lib/imagekit.js'
import type { AssetCleanupRepository, PendingDeletion } from './asset-cleanup.repository.js'

const LEASE_SECONDS = 120
const MAX_BACKOFF_SECONDS = 6 * 60 * 60

/**
 * Deletes ImageKit assets whose database rows were removed.
 *
 * Order of operations (see docs/architecture/image-management.md):
 *   1. The transaction that deletes image rows also writes their file IDs to
 *      pending_asset_deletions (enqueue).
 *   2. After commit, the request deletes them from ImageKit right away
 *      (deleteNow). Each success removes its queue row.
 *   3. Failures stay queued with exponential backoff and are retried by the
 *      periodic job (processDue) or `npm run assets:cleanup`.
 *
 * The database never points at a deleted asset, because rows are removed
 * first. The worst case is a file left in ImageKit for a while, and the queue
 * guarantees it is removed eventually.
 */
export class AssetCleanupService {
  constructor(
    private readonly db: Database,
    private readonly repository: AssetCleanupRepository,
    private readonly imagekit: ImageKitClient,
    private readonly logger: FastifyBaseLogger,
  ) {}

  enqueue(tx: Executor, fileIds: string[]): Promise<void> {
    return this.repository.enqueue(tx, [...new Set(fileIds)])
  }

  /** Best effort; never throws. Call after the enqueueing transaction commits. */
  async deleteNow(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return
    try {
      const claimed = await this.repository.claimByFileIds(this.db.sql, fileIds, LEASE_SECONDS)
      await this.process(claimed)
    } catch (error) {
      this.logger.warn({ err: error, fileIds }, 'Immediate ImageKit cleanup failed; will retry from queue')
    }
  }

  /** Processes queue rows that are due for another attempt. */
  async processDue(limit = 50): Promise<{ attempted: number; failed: number }> {
    const claimed = await this.repository.claimDue(this.db.sql, limit, LEASE_SECONDS)
    const failed = await this.process(claimed)
    return { attempted: claimed.length, failed }
  }

  private async process(rows: PendingDeletion[]): Promise<number> {
    let failed = 0
    for (const row of rows) {
      try {
        await this.imagekit.deleteFile(row.imagekitFileId)
        await this.repository.complete(this.db.sql, row.id)
      } catch (error) {
        failed++
        const backoff = Math.min(60 * 2 ** row.attempts, MAX_BACKOFF_SECONDS)
        this.logger.warn(
          { err: error, fileId: row.imagekitFileId, attempts: row.attempts + 1 },
          'ImageKit asset deletion failed',
        )
        await this.repository.fail(this.db.sql, row.id, (error as Error).message, backoff).catch(() => {})
      }
    }
    return failed
  }
}
