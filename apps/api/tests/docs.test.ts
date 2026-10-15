/**
 * Keeps documentation and implementation in sync (docs/development/contributing.md):
 *  - every HTTP route the server registers is documented in docs/
 *  - every relative markdown link (and #anchor) in the docs resolves
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildTestApp } from './helpers.js'

const root = resolve(import.meta.dirname, '..')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
const markdownFiles = [...walk(join(root, 'docs')), join(root, 'README.md')].filter((file) => file.endsWith('.md'))

/** GitHub-style heading anchor. */
const anchorOf = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-')

describe('documentation', () => {
  it('documents every registered route', async () => {
    const { app } = await buildTestApp({ ENABLE_API_DOCS: 'true' })
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json() as { paths: Record<string, object> }
    const docs = markdownFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

    const undocumented = Object.keys(spec.paths)
      .map((path) => path.replace(/\{(\w+)\}/g, ':$1').replace(/(.)\/$/, '$1'))
      .filter((path) => !docs.includes(path))

    expect(Object.keys(spec.paths).length).toBeGreaterThan(15)
    expect(undocumented).toEqual([])
  })

  it('has no broken relative links or anchors', () => {
    const broken: string[] = []
    for (const file of markdownFiles) {
      for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:)/.test(target!)) continue
        const [path, anchor] = target!.split('#')
        const destination = path ? resolve(dirname(file), path) : file
        const from = file.slice(root.length)
        if (!existsSync(destination)) {
          broken.push(`${from} -> ${target}`)
          continue
        }
        if (anchor && destination.endsWith('.md')) {
          const anchors = [...readFileSync(destination, 'utf8').matchAll(/^#+\s+(.+)$/gm)].map((m) => anchorOf(m[1]!))
          if (!anchors.includes(anchor)) broken.push(`${from} -> ${target} (missing anchor)`)
        }
      }
    }
    expect(broken).toEqual([])
  })
})
