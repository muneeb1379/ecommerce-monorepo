import { loadConfig } from './app/config.js'
import { buildApp } from './app/server.js'
import { createSupabaseTokenVerifier } from './lib/auth/token-verifier.js'
import { createDatabase } from './lib/db.js'
import { createImageKitClient } from './lib/imagekit.js'

/**
 * Process entry point: config → dependencies → app → listen, plus the
 * ImageKit cleanup job and graceful shutdown.
 */
async function main(): Promise<void> {
  const config = loadConfig()
  const db = createDatabase(config.database)
  const { app, services } = await buildApp(config, {
    db,
    tokenVerifier: createSupabaseTokenVerifier({ supabaseUrl: config.supabase.url, jwtSecret: config.supabase.jwtSecret }),
    imagekit: createImageKitClient(config.imagekit),
  })

  // Retries ImageKit deletions that failed during a request.
  let cleanupTimer: NodeJS.Timeout | undefined
  if (config.assetCleanupIntervalMs > 0) {
    cleanupTimer = setInterval(() => {
      services.assets
        .processDue()
        .then((result) => {
          if (result.attempted > 0) app.log.info(result, 'Processed pending ImageKit deletions')
        })
        .catch((error) => app.log.error({ err: error }, 'ImageKit cleanup job failed'))
    }, config.assetCleanupIntervalMs)
    cleanupTimer.unref()
  }

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'Shutting down')
    clearInterval(cleanupTimer)
    try {
      await app.close()
      await db.close()
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown')
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  await app.listen({ host: config.host, port: config.port })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
