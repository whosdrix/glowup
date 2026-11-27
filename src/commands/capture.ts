import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { buildBrand } from '../lib/brand.js'
import { newPage, settle, type ViewportName } from '../lib/browser.js'
import { contentMarkdown, type PageContent, pickSubpages } from '../lib/content.js'
import { extractPage, type RawPage } from '../lib/inpage.js'
import { log } from '../lib/log.js'
import { ensureDir, normalizeUrl, pageSlug, siteKey, workspace } from '../lib/paths.js'
import { browserSession } from '../lib/session.js'

export interface CaptureOptions {
  url: string
  root: string
  pages: number
  outDir?: string
  quiet?: boolean
}

export interface CaptureResult {
  dir: string
  pages: { slug: string; url: string }[]
  brandName: string
}

const MAX_SHOT_HEIGHT = 8000

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
}

export async function shoot(page: Page, dir: string, viewport: ViewportName): Promise<void> {
  await page.screenshot({ path: join(dir, `${viewport}.png`) })
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const width = page.viewportSize()?.width ?? 1440
  await page.screenshot({
    path: join(dir, `${viewport}-full.png`),
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.min(height, MAX_SHOT_HEIGHT) },
  })
}

/**
 * Screenshots every page at desktop and mobile sizes, writing PNGs to
 * `<dir>/pages/<slug>/`. Returns what the desktop pass extracted.
 */
export async function capturePages(
  browser: Browser,
  urls: string[],
  dir: string,
  opts: { extract: boolean; followNav?: number; home?: string; quiet?: boolean },
): Promise<{
  raw: RawPage[]
  images: Map<string, { body: Buffer; type: string }>
  urls: string[]
}> {
  const images = new Map<string, { body: Buffer; type: string }>()
  const raw: RawPage[] = []
  const home = opts.home ?? urls[0] ?? ''
  const queue = [...urls]

  const desktop = await newPage(browser, 'desktop')
  desktop.page.on('response', async (res) => {
    const type = (res.headers()['content-type'] ?? '').split(';')[0]?.trim() ?? ''
    if (!type.startsWith('image/') && res.request().resourceType() !== 'image') return
    try {
      const body = await res.body()
      if (body.length > 100) images.set(res.url(), { body, type })
    } catch {}
  })

  for (let i = 0; i < queue.length; i++) {
    const url = queue[i] as string
    const slug = pageSlug(url, home)
    const pageDir = await ensureDir(join(dir, 'pages', slug))
    const res = await desktop.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    if (res && res.status() >= 400) log.warn(`${url} returned ${res.status()}`)
    await settle(desktop.page)
    await shoot(desktop.page, pageDir, 'desktop')
    if (opts.extract) {
      const data = await desktop.page.evaluate(extractPage)
      raw.push(data)
      if (i === 0 && opts.followNav) {
        const extra = pickSubpages(
          data.url,
          [...data.nav, ...data.hrefs.map((href) => ({ href }))],
          opts.followNav,
        )
        queue.push(...extra)
      }
    }
    if (!opts.quiet) log.ok(`desktop ${slug}`)
  }
  await desktop.context.close()

  const mobile = await newPage(browser, 'mobile')
  for (const url of queue) {
    const slug = pageSlug(url, home)
    await mobile.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await settle(mobile.page)
    await shoot(mobile.page, join(dir, 'pages', slug), 'mobile')
    if (!opts.quiet) log.ok(`mobile ${slug}`)
  }
  await mobile.context.close()
  return { raw, images, urls: queue }
}

async function saveImage(
  src: string,
  images: Map<string, { body: Buffer; type: string }>,
  assets: string,
  saved: Map<string, string>,
): Promise<string | null> {
  if (saved.has(src)) return saved.get(src) ?? null
  const hit = images.get(src)
  if (!hit) return null
  const urlExt = extname(new URL(src).pathname).toLowerCase()
  const ext = EXT[hit.type] ?? (urlExt && urlExt.length <= 5 ? urlExt : '.bin')
  const name = `${createHash('sha1').update(src).digest('hex').slice(0, 10)}${ext}`
  const file = join(assets, name)
  await writeFile(file, hit.body)
  saved.set(src, file)
  return file
}

export async function capture(opts: CaptureOptions): Promise<CaptureResult> {
  const url = normalizeUrl(opts.url)
  const ws = workspace(opts.root, siteKey(url))
  const dir = await ensureDir(opts.outDir ?? ws.capture)
  const assets = await ensureDir(join(dir, 'assets'))

  log.step(`Capturing ${url}`)
  return browserSession(async (browser) => {
    const { raw, images } = await capturePages(browser, [url], dir, {
      extract: true,
      followNav: Math.max(0, opts.pages - 1),
      quiet: opts.quiet,
    })
    const home = raw[0]
    if (!home) throw new Error(`Nothing captured from ${url}`)

    const saved = new Map<string, string>()
    const rel = (file: string | null) => (file ? relative(dir, file) : null)
    for (const page of raw) {
      for (const img of page.images) {
        const file = await saveImage(img.src, images, assets, saved)
        if (file) img.src = rel(file) ?? img.src
      }
      for (const block of page.blocks) {
        if (block.kind === 'image' && block.src) {
          const file = await saveImage(block.src, images, assets, saved)
          if (file) block.src = rel(file) ?? block.src
        }
      }
    }
    const logoFile = home.logo ? await saveImage(home.logo.src, images, assets, saved) : null
    const faviconFile = home.favicon ? await saveImage(home.favicon, images, assets, saved) : null
    const ogFile = home.ogImage ? await saveImage(home.ogImage, images, assets, saved) : null

    const brand = buildBrand(raw, rel(logoFile), rel(faviconFile))
    const pages: PageContent[] = raw.map((p) => ({
      slug: pageSlug(p.url, url),
      url: p.url,
      title: p.title,
      description: p.description,
      blocks: p.blocks,
    }))

    const content = {
      url,
      capturedAt: new Date().toISOString(),
      name: brand.name,
      lang: home.lang,
      ogImage: rel(ogFile) ?? home.ogImage,
      nav: home.nav,
      footer: home.footer,
      forms: raw.flatMap((p) => p.forms.map((f) => ({ page: pageSlug(p.url, url), ...f }))),
      pages,
      images: raw
        .flatMap((p) => p.images)
        .filter((img, i, arr) => arr.findIndex((x) => x.src === img.src) === i),
    }

    await writeFile(join(dir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`)
    await writeFile(join(dir, 'brand.json'), `${JSON.stringify(brand, null, 2)}\n`)
    await writeFile(
      join(dir, 'content.md'),
      contentMarkdown(brand.name, pages, home.nav, home.footer),
    )

    log.ok(`${pages.length} pages, ${saved.size} images, brand "${brand.name}"`)
    log.ok(
      `accent ${brand.accent ?? 'none'}, fonts ${brand.fonts.body.map((f) => f.family).join(', ') || 'unknown'}`,
    )
    const c = brand.contact
    log.ok(
      `contact: ${c.emails.length} email, ${c.phones.length} phone, ${c.socials.length} social, ${c.hours.length} hours lines`,
    )
    log.ok(`saved to ${dir}`)
    return { dir, pages: pages.map((p) => ({ slug: p.slug, url: p.url })), brandName: brand.name }
  })
}
