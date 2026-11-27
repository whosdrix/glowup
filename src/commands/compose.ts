import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Browser } from 'playwright-core'
import { log } from '../lib/log.js'
import { ensureDir, normalizeUrl, siteKey, type Workspace, workspace } from '../lib/paths.js'
import { type DeltaRow, deltaRows } from '../lib/report.js'
import { browserSession } from '../lib/session.js'
import type { AuditReport } from './audit.js'

const PRIORITY: DeltaRow['key'][] = [
  'contrastErrors',
  'a11yViolations',
  'smallTapTargets',
  'horizontalOverflow',
  'missingAlt',
  'minFontSize',
  'lineLength',
  'pageWeight',
  'layoutShift',
]

export function headlineDeltas(rows: DeltaRow[], limit = 4): DeltaRow[] {
  return PRIORITY.map((k) => rows.find((r) => r.key === k))
    .filter((r): r is DeltaRow => Boolean(r?.better))
    .slice(0, limit)
}

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  )
}

async function dataUri(file: string): Promise<string> {
  return `data:image/png;base64,${(await readFile(file)).toString('base64')}`
}

export function composeHtml(input: {
  name: string
  host: string
  before: { desktop: string; mobile: string; score: number }
  after: { desktop: string; mobile: string; score: number }
  deltas: DeltaRow[]
}): string {
  const panel = (label: string, side: typeof input.before, accent: boolean) => `
    <section class="panel">
      <div class="head">
        <span class="pill ${accent ? 'pill-accent' : ''}">${label}</span>
        <span class="score"><b>${side.score}</b>/100</span>
      </div>
      <div class="stage">
        <div class="browser">
          <div class="bar"><i></i><i></i><i></i></div>
          <img class="desktop" src="${side.desktop}" alt="">
        </div>
        <div class="phone"><img src="${side.mobile}" alt=""></div>
      </div>
    </section>`
  const deltas = input.deltas
    .map(
      (d) =>
        `<div class="delta"><span>${esc(d.label)}</span><b>${esc(d.before)} <em>→</em> ${esc(d.after)}</b></div>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1600px; height: 1000px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: radial-gradient(1200px 700px at 15% 0%, #1a2550 0%, transparent 60%), linear-gradient(160deg, #0d1330, #070b1c);
    color: #e8ecf8; padding: 48px 56px; display: flex; flex-direction: column; gap: 28px; overflow: hidden; }
  header { display: flex; justify-content: space-between; align-items: baseline; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
  h1 span { color: #8b96b8; font-weight: 500; }
  .brand { color: #8b96b8; font-size: 18px; letter-spacing: 0.02em; }
  .brand b { color: #e8ecf8; }
  main { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; flex: 1; min-height: 0; }
  .panel { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .pill { font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; padding: 7px 14px;
    border-radius: 999px; background: #1f2747; color: #aab4d4; }
  .pill-accent { background: #5b8cff; color: #fff; }
  .score { color: #8b96b8; font-size: 18px; }
  .score b { color: #fff; font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
  .stage { position: relative; flex: 1; }
  .browser { position: absolute; inset: 0 70px 40px 0; border-radius: 12px; overflow: hidden; background: #fff;
    box-shadow: 0 30px 60px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08); }
  .bar { height: 30px; background: #e9ebf0; display: flex; align-items: center; gap: 7px; padding: 0 12px; }
  .bar i { width: 11px; height: 11px; border-radius: 50%; background: #c9ccd4; }
  .desktop { width: 100%; height: auto; display: block; }
  .phone { position: absolute; right: 0; bottom: 0; width: 176px; height: 362px; border-radius: 26px; padding: 7px;
    background: #10131d; box-shadow: 0 24px 50px -12px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.12); }
  .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 20px; display: block; }
  footer { display: grid; grid-template-columns: repeat(${Math.max(1, input.deltas.length)}, 1fr); gap: 16px; }
  .delta { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 14px 18px;
    display: flex; flex-direction: column; gap: 4px; }
  .delta span { color: #8b96b8; font-size: 15px; }
  .delta b { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
  .delta em { font-style: normal; color: #5b8cff; }
  .accent-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: #5b8cff; }
</style></head><body>
  <header><h1>${esc(input.name)} <span>${esc(input.host)}</span></h1><div class="brand"><b>glowup</b> · score ${input.before.score} → ${input.after.score}</div></header>
  <main>${panel('Before', input.before, false)}${panel('After', input.after, true)}</main>
  ${deltas ? `<footer>${deltas}</footer>` : ''}
  <div class="accent-bar"></div>
</body></html>`
}

export async function composeProof(
  browser: Browser,
  ws: Workspace,
  slug = 'home',
): Promise<string> {
  const before = JSON.parse(await readFile(ws.audit, 'utf8')) as AuditReport
  const after = JSON.parse(await readFile(ws.auditAfter, 'utf8')) as AuditReport
  const shots = (dir: string) => ({
    desktop: join(dir, 'pages', slug, 'desktop-full.png'),
    mobile: join(dir, 'pages', slug, 'mobile.png'),
  })
  const b = shots(ws.capture)
  const a = shots(ws.after)
  for (const f of [b.desktop, b.mobile, a.desktop, a.mobile]) {
    if (!existsSync(f)) throw new Error(`Missing screenshot ${f}. Run capture and verify first.`)
  }
  const html = composeHtml({
    name: before.name,
    host: new URL(before.url).host || before.name,
    before: {
      desktop: await dataUri(b.desktop),
      mobile: await dataUri(b.mobile),
      score: before.score,
    },
    after: {
      desktop: await dataUri(a.desktop),
      mobile: await dataUri(a.mobile),
      score: after.score,
    },
    deltas: headlineDeltas(deltaRows(before.totals, after.totals)),
  })
  await ensureDir(ws.proof)
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  const out = join(ws.proof, slug === 'home' ? 'before-after.png' : `before-after-${slug}.png`)
  await page.screenshot({ path: out })
  await context.close()
  return out
}

export async function compose(opts: { url: string; root: string }): Promise<string> {
  const ws = workspace(opts.root, siteKey(normalizeUrl(opts.url)))
  return browserSession(async (browser) => {
    const out = await composeProof(browser, ws)
    log.ok(`proof image written to ${out}`)
    return out
  })
}
