import { describe, expect, it } from 'vitest'
import { buildTestApp } from './helpers.js'

describe('app boot', () => {
  it('serves health and generates OpenAPI', async () => {
    const { app } = await buildTestApp({ ENABLE_API_DOCS: 'true' })
    const health = await app.inject({ method: 'GET', url: '/health' })
    expect(health.statusCode).toBe(200)
    const spec = await app.inject({ method: 'GET', url: '/docs/json' })
    expect(spec.statusCode).toBe(200)
    expect(Object.keys(spec.json().paths).length).toBeGreaterThan(10)
  })
})
