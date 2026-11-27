import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { audit } from '../src/commands/audit.js'
import { capture } from '../src/commands/capture.js'
import { status } from '../src/commands/status.js'
import { verify } from '../src/commands/verify.js'
import { serveStatic } from '../src/lib/server.js'

const fixtures = join(import.meta.dirname, 'fixtures', 'sites')

describe('capture, audit and verify an old site', () => {
  let root: string
  let server: Awaited<ReturnType<typeof serveStatic>>

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'glowup-'))
    server = await serveStatic(join(fixtures, 'bakery'))
  })

  afterAll(async () => {
    await server.close()
    await rm(root, { recursive: true, force: true })
  })

  it('captures pages, content, brand and contact details', async () => {
    const result = await capture({ url: server.url, root, pages: 5, quiet: true })
    expect(result.brandName).toBe('Pekárna Hora')
    expect(result.pages.map((p) => p.slug)).toEqual(['home', 'about', 'contact'])

    for (const shot of ['desktop.png', 'desktop-full.png', 'mobile.png', 'mobile-full.png']) {
      expect(existsSync(join(result.dir, 'pages', 'home', shot))).toBe(true)
    }

    const brand = JSON.parse(await readFile(join(result.dir, 'brand.json'), 'utf8'))
    expect(brand.accent).toBe('#8b1e1e')
    expect(brand.fonts.systemDefaultsOnly).toBe(true)
    expect(brand.contact.emails).toEqual(['info@pekarnahora.cz'])
    expect(brand.contact.phones[0]).toBe('+420 543 210 987')
    expect(brand.contact.socials[0].network).toBe('facebook')
    expect(brand.business['@type']).toBe('Bakery')
    expect(brand.logo).toMatch(/^assets\/.+\.svg$/)

    const md = await readFile(join(result.dir, 'content.md'), 'utf8')
    expect(md).toContain('### Vítejte na stránkách Pekárny Hora!!!')
    expect(md).toContain('Pečeme v Brně od roku 1994.')
    expect(md).toContain('[button: Objednat koláčky]')
    expect(md).not.toContain('\nÚvod | O nás')
    expect(md).toContain('| Den | Otevřeno |')
  })

  it('scores the old site low and explains why', async () => {
    const report = await audit({ url: server.url, root, pages: 5 })
    expect(report.pages).toHaveLength(3)
    expect(report.score).toBeLessThan(65)
    expect(report.totals.contrastErrors).toBeGreaterThan(5)
    expect(report.totals.missingAlt).toBeGreaterThan(0)
    expect(report.totals.minFontSize).toBeLessThan(12)
    expect(report.totals.lineLength).toBeGreaterThan(95)
    const home = report.pages[0]
    expect(home?.metrics.viewportMeta).toBe(false)
    expect(home?.score.penalties.map((p) => p.metric)).toContain('contrastErrors')
  })

  it('verifies a rebuilt site and writes the proof image', async () => {
    const result = await verify({ url: server.url, root, dist: join(fixtures, 'bakery-new') })
    expect(result.failures).toEqual([])
    expect(result.after.score).toBeGreaterThan(result.before.score)
    expect(result.after.totals.contrastErrors).toBe(0)
    expect(result.proof && existsSync(result.proof)).toBe(true)
    expect(await status({ url: server.url, root })).toContain('✓ proof')
  })
})
