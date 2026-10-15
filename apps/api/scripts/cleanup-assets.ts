/**
 * Retries ImageKit deletions left in pending_asset_deletions (e.g. ImageKit
 * was down when an image was deleted). The API server also runs this on an
 * interval (ASSET_CLEANUP_INTERVAL_MS); this script is for cron or manual use.
 *
 *   npm run assets:cleanup
 */
import pino from 'pino'
import { loadConfig } from '../src/app/config.js'
import { createDatabase } from '../src/lib/db.js'
import { createImageKitClient } from '../src/lib/imagekit.js'
import { assetCleanupRepository } from '../src/modules/uploads/asset-cleanup.repository.js'
import { AssetCleanupService } from '../src/modules/uploads/asset-cleanup.service.js'

const config = loadConfig()
const logger = pino({ level: config.logLevel })
const db = createDatabase(config.database)
const service = new AssetCleanupService(db, assetCleanupRepository, createImageKitClient(config.imagekit), logger)

try {
  let total = 0
  let failed = 0
  for (;;) {
    const result = await service.processDue(100)
    total += result.attempted
    failed += result.failed
    // Stop when nothing is due, or when a whole batch failed (backed off).
    if (result.attempted === 0 || result.failed === result.attempted) break
  }
  logger.info({ attempted: total, failed }, 'ImageKit cleanup finished')
  if (failed > 0) process.exitCode = 1
} finally {
  await db.close()
}
