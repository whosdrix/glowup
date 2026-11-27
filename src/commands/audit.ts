import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Browser } from 'playwright-core'
import { loadRuntime, newPage, settle } from '../lib/browser.js'
import { pickSubpages } from '../lib/content.js'
import { extractPage, LAYOUT_SHIFT_INIT, measurePage, type RawMeasure } from '../lib/inpage.js'
import { log } from '../lib/log.js'
import { ensureDir, normalizeUrl, pageSlug, siteKey, workspace } from '../lib/paths.js'
import { auditMarkdown } from '../lib/report.js'
import {
  type Finding,
  type PageMetrics,
  type PageScore,
  scorePage,
  siteScore,
  type Totals,
  totals,
} from '../lib/score.js'
import { browserSession } from '../lib/session.js'

export interface PageAudit {
  metrics: PageMetrics
  score: PageScore
  details: {
    smallTapTargets: RawMeasure['smallTapTargets']
    missingAlt: RawMeasure['missingAlt']
  }
}

export interface AuditReport {
  url: string
  name: string
  auditedAt: string
  score: number
  totals: Totals
  pages: PageAudit[]
}

interface AxeNode {
  target: string[]
}
interface AxeViolation {
  id: string
  impact: Finding['impact'] | null
  help: string
  nodes: AxeNode[]
}

async function auditOne(
  browser: Browser,
  url: string,
  home: string,
  axeSource: string,
): Promise<PageAudit> {
  const desktop = await newPage(browser, 'desktop')
  await desktop.context.addInitScript(LAYOUT_SHIFT_INIT)
  let weight = 0
  let requests = 0
  const pending: Promise<void>[] = []
  desktop.page.on('requestfinished', (req) => {
    requests++
    pending.push(
      req
        .sizes()
        .then((s) => {
          weight += s.responseBodySize + s.responseHeadersSize
        })
        .catch(() => {}),
    )
  })
  await desktop.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await settle(desktop.page)
  await Promise.all(pending)
  if (url.startsWith('file:')) {
    weight = await desktop.page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .concat(performance.getEntriesByType('navigation'))
        .reduce((s, e) => s + ((e as PerformanceResourceTiming).decodedBodySize || 0), 0),
    )
  }

  await desktop.page.addScriptTag({ content: axeSource })
  const violations = (await desktop.page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> }
      }
    ).axe
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    })
    return result.violations
  })) as AxeViolation[]
  const desk = await desktop.page.evaluate(measurePage)
  await desktop.context.close()

  const mobile = await newPage(browser, 'mobile')
  await mobile.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await settle(mobile.page)
  const mob = await mobile.page.evaluate(measurePage)
  await mobile.context.close()

  const findings: Finding[] = violations.map((v) => ({
    rule: v.id,
    impact: v.impact ?? 'moderate',
    count: v.nodes.length,
    help: v.help,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }))

  const metrics: PageMetrics = {
    url,
    slug: pageSlug(url, home),
    contrastErrors: findings.find((f) => f.rule === 'color-contrast')?.count ?? 0,
    a11yViolations: findings,
    missingAlt: desk.missingAlt.length,
    minFontSize: mob.minFontSize,
    smallTextShare: mob.smallTextShare,
    lineLength: desk.lineLength,
    smallTapTargets: mob.smallTapTargets.length,
    horizontalOverflow: mob.horizontalOverflow,
    viewportMeta: mob.viewportMeta,
    layoutShift: desk.layoutShift,
    pageWeight: weight,
    requests,
    fontFamilies: desk.fontFamilies,
    textColors: desk.textColors,
    h1Count: desk.h1Count,
  }
  return {
    metrics,
    score: scorePage(metrics),
    details: {
      smallTapTargets: mob.smallTapTargets.slice(0, 20),
      missingAlt: desk.missingAlt.slice(0, 20),
    },
  }
}

export async function auditUrls(
  browser: Browser,
  urls: string[],
  name: string,
): Promise<AuditReport> {
  const { axeSource } = await loadRuntime()
  const home = urls[0] as string
  const pages: PageAudit[] = []
  for (const url of urls) {
    const result = await auditOne(browser, url, home, axeSource)
    log.ok(`${result.metrics.slug}: ${result.score.score}/100`)
    pages.push(result)
  }
  return {
    url: home,
    name,
    auditedAt: new Date().toISOString(),
    score: siteScore(pages.map((p) => p.score)),
    totals: totals(pages.map((p) => p.metrics)),
    pages,
  }
}

/** Use the capture's page list when there is one, so before and after audit the same pages. */
async function resolvePages(browser: Browser, url: string, captureDir: string, limit: number) {
  const contentFile = join(captureDir, 'content.json')
  if (existsSync(contentFile)) {
    const content = JSON.parse(await readFile(contentFile, 'utf8')) as {
      name: string
      pages: { url: string }[]
    }
    if (content.pages[0] && new URL(content.pages[0].url).host === new URL(url).host) {
      return { urls: content.pages.map((p) => p.url), name: content.name }
    }
  }
  const { page, context } = await newPage(browser, 'desktop')
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await settle(page)
  const raw = await page.evaluate(extractPage)
  await context.close()
  const extra = pickSubpages(
    raw.url,
    [...raw.nav, ...raw.hrefs.map((href) => ({ href }))],
    limit - 1,
  )
  return { urls: [raw.url, ...extra], name: raw.title || new URL(url).host }
}

export async function audit(opts: {
  url: string
  root: string
  pages: number
  out?: string
}): Promise<AuditReport> {
  const url = normalizeUrl(opts.url)
  const ws = workspace(opts.root, siteKey(url))
  log.step(`Auditing ${url}`)
  return browserSession(async (browser) => {
    const { urls, name } = await resolvePages(browser, url, ws.capture, opts.pages)
    const report = await auditUrls(browser, urls, name)
    const jsonPath = opts.out ?? ws.audit
    await ensureDir(dirname(jsonPath))
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
    await writeFile(jsonPath.replace(/\.json$/, '.md'), auditMarkdown(report))
    log.ok(`score ${report.score}/100, written to ${jsonPath}`)
    return report
  })
}
