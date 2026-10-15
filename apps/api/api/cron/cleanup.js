import { getApp } from '../_app.js'

/**
 * Vercel Cron replacement for the in-process ImageKit cleanup interval.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401
    res.end('Unauthorized')
    return
  }

  const { services } = await getApp()
  let attempted = 0
  let failed = 0
  for (;;) {
    const result = await services.assets.processDue(100)
    attempted += result.attempted
    failed += result.failed
    if (result.attempted === 0 || result.failed === result.attempted) break
  }

  res.statusCode = failed > 0 ? 500 : 200
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ attempted, failed }))
}
