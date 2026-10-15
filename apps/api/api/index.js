import { getApp } from './_app.js'

/** Vercel entry point: forwards every request to the Fastify server. */
export default async function handler(req, res) {
  try {
    const { app } = await getApp()
    app.server.emit('request', req, res)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Server failed to start' }))
  }
}
