import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { newPage, settle } from '../lib/browser.js'
import { pickSubpages } from '../lib/content.js'
import { extractPage } from '../lib/inpage.js'
import { log } from '../lib/log.js'
import { normalizeUrl, siteKey, workspace } from '../lib/paths.js'
import { auditMarkdown, deltaMarkdown, deltaRows } from '../lib/report.js'
import { serveStatic } from '../lib/server.js'
import { browserSession } from '../lib/session.js'
import { type AuditReport, auditUrls } from './audit.js'
import { capturePages } from './capture.js'
import { composeProof } from './compose.js'

export interface Budget {
  minScore: number
  maxLineLength: number
}

export const DEFAULT_BUDGET: Budget = { minScore: 90, maxLineLength: 80 }

export interface VerifyResult {
  passed: boolean
  failures: string[]
  before: AuditReport
  after: AuditReport
  proof: string | null
}

export function checkBudget(
  before: AuditReport,
  after: AuditReport,
  budget: Budget = DEFAULT_BUDGET,
): string[] {
  const failures: string[] = []
  const t = after.totals
  if (after.score < before.score)
    failures.push(`score dropped from ${before.score} to ${after.score}`)
  if (after.score < budget.minScore)
    failures.push(`score ${after.score} is below ${budget.minScore}`)
  if (t.contrastErrors > 0) failures.push(`${t.contrastErrors} contrast errors`)
  if (t.missingAlt > 0) failures.push(`${t.missingAlt} images without alt text`)
  if (t.horizontalOverflow > 0)
    failures.push(`${t.horizontalOverflow} pages scroll sideways on mobile`)
  if (t.smallTapTargets > 0) failures.push(`${t.smallTapTargets} tap targets under 24px`)
  if (t.lineLength > budget.maxLineLength)
    failures.push(`lines run ${t.lineLength} characters (max ${budget.maxLineLength})`)
  for (const row of deltaRows(before.totals, after.totals)) {
    if (row.worse && row.key !== 'pageWeight')
      failures.push(`${row.label} got worse: ${row.before} → ${row.after}`)
  }
  for (const page of after.pages) {
    if (!page.metrics.viewportMeta) failures.push(`${page.metrics.slug}: missing viewport meta`)
    if (page.metrics.h1Count !== 1)
      failures.push(`${page.metrics.slug}: ${page.metrics.h1Count} h1 headings`)
    for (const v of page.metrics.a11yViolations) {
      failures.push(
        `${page.metrics.slug}: ${v.rule} (${v.count}×) ${v.targets.slice(0, 2).join(', ')}`,
      )
    }
    for (const t of page.details.smallTapTargets.slice(0, 3)) {
      failures.push(`${page.metrics.slug}: small tap target ${t.selector} (${t.width}×${t.height})`)
    }
  }
  return [...new Set(failures)]
}

export async function verify(opts: {
  url: string
  root: string
  dist?: string
  budget?: Budget
}): Promise<VerifyResult> {
  const original = normalizeUrl(opts.url)
  const ws = workspace(opts.root, siteKey(original))
  const dist = opts.dist ?? join(ws.site, 'dist')
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`No built site at ${dist}. Run "npm run build" in ${ws.site} first.`)
  }
  if (!existsSync(ws.audit)) {
    throw new Error(`No baseline audit at ${ws.audit}. Run "glowup audit ${opts.url}" first.`)
  }
  const before = JSON.parse(await readFile(ws.audit, 'utf8')) as AuditReport
  const server = await serveStatic(dist)
  log.step(`Verifying the new site at ${server.url}`)
  try {
    return await browserSession(async (browser) => {
      const { page, context } = await newPage(browser, 'desktop')
      await page.goto(server.url)
      await settle(page)
      const raw = await page.evaluate(extractPage)
      await context.close()
      const pageCount = Math.max(1, before.pages.length)
      const urls = [
        server.url,
        ...pickSubpages(
          server.url,
          [...raw.nav, ...raw.hrefs.map((href) => ({ href }))],
          pageCount - 1,
        ),
      ]
      await capturePages(browser, urls, ws.after, { extract: false, home: server.url, quiet: true })
      const report = await auditUrls(browser, urls, before.name)
      const after: AuditReport = { ...report, url: before.url, name: before.name }
      await writeFile(ws.auditAfter, `${JSON.stringify(after, null, 2)}\n`)
      await writeFile(ws.auditAfterMd, auditMarkdown(after))

      const failures = checkBudget(before, after, opts.budget)
      let proof: string | null = null
      proof = await composeProof(browser, ws)
      await writeFile(join(ws.proof, 'delta.md'), deltaMarkdown(before, after))

      for (const row of deltaRows(before.totals, after.totals)) {
        const mark = row.better ? '✓' : row.worse ? '✗' : ' '
        process.stderr.write(
          `  ${mark} ${row.label.padEnd(28)} ${row.before.padStart(8)} → ${row.after}\n`,
        )
      }
      process.stderr.write(`\n  Score ${before.score} → ${after.score}\n\n`)
      if (failures.length) {
        log.fail(`${failures.length} problems to fix:`)
        for (const f of failures) process.stderr.write(`  - ${f}\n`)
      } else {
        log.ok('All checks pass')
      }
      log.ok(`proof: ${proof}`)
      return { passed: failures.length === 0, failures, before, after, proof }
    })
  } finally {
    await server.close()
  }
}
