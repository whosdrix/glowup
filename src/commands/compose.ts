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
  const panel = (label: string, side: typeof input.before, after: boolean) => `
    <section class="panel${after ? ' is-after' : ''}">
      <div class="head">
        <span class="pill">${label}</span>
        <span class="score"><b>${side.score}</b><i>/100</i></span>
      </div>
      <div class="stage">
        <div class="browser">
          <div class="bar"><i></i><i></i><i></i><span></span></div>
          <div class="shot"><img src="${side.desktop}" alt=""></div>
        </div>
        <div class="phone"><img src="${side.mobile}" alt=""></div>
      </div>
    </section>`
  const deltas = input.deltas
    .map(
      (d) =>
        `<div class="delta"><span>${esc(d.label)}</span><b>${esc(d.before)}<em>→</em>${esc(d.after)}</b></div>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { position: relative; width: 1600px; height: 1000px; overflow: hidden; padding: 52px 64px 60px;
    display: flex; flex-direction: column; color: #f2f5ff;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(1100px 620px at 88% -8%, rgba(91,140,255,.22), transparent 62%),
      radial-gradient(900px 600px at 0% 100%, rgba(91,140,255,.08), transparent 60%),
      linear-gradient(155deg, #101a3c 0%, #0a1026 55%, #070b1a 100%); }
  header { display: flex; justify-content: space-between; align-items: flex-end; gap: 48px; }
  .title { min-width: 0; }
  .eyebrow { font-size: 19px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #5b8cff; }
  .eyebrow span { color: #6f7ba3; font-weight: 600; }
  h1 { margin-top: 10px; font-size: 50px; line-height: 1.1; font-weight: 800; letter-spacing: -.03em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .host { margin-top: 6px; font-size: 24px; color: #8f9bc2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .total { flex: none; text-align: right; }
  .total small { display: block; font-size: 19px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #6f7ba3; }
  .total p { margin-top: 2px; font-size: 76px; line-height: 1; font-weight: 800; letter-spacing: -.04em;
    font-variant-numeric: tabular-nums; }
  .total s { text-decoration: none; color: #8f9bc2; }
  .total em { font-style: normal; color: #5b8cff; margin: 0 16px; font-weight: 600; }
  main { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; margin-top: 34px; }
  .panel { display: flex; flex-direction: column; min-height: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; height: 44px; }
  .pill { font-size: 19px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; padding: 8px 18px;
    border-radius: 999px; background: rgba(255,255,255,.07); color: #aeb9dc; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
  .is-after .pill { background: #5b8cff; color: #fff; box-shadow: none; }
  .score { font-variant-numeric: tabular-nums; color: #8f9bc2; }
  .score b { font-size: 36px; font-weight: 800; letter-spacing: -.03em; }
  .score i { font-style: normal; font-size: 22px; color: #6f7ba3; margin-left: 2px; }
  .is-after .score b { color: #fff; }
  .stage { position: relative; flex: 1; min-height: 0; margin-top: 18px; }
  .browser { position: absolute; left: 0; top: 0; right: 84px; border-radius: 14px; overflow: hidden; background: #fff;
    box-shadow: 0 36px 70px -24px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.1); }
  .is-after .browser { box-shadow: 0 36px 70px -24px rgba(0,0,0,.75), 0 0 0 2px #5b8cff; }
  .bar { height: 34px; background: #e7eaf1; display: flex; align-items: center; gap: 8px; padding: 0 14px; }
  .bar i { width: 12px; height: 12px; border-radius: 50%; background: #c3c8d4; }
  .bar span { flex: 1; height: 16px; margin-left: 14px; border-radius: 8px; background: #f6f7fa; }
  .shot { aspect-ratio: 1440 / 900; background: #fff; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .phone { position: absolute; right: 0; bottom: 0; width: 196px; border-radius: 30px; padding: 8px; background: #0c0f1a;
    box-shadow: 0 28px 56px -14px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.16); }
  .is-after .phone { box-shadow: 0 28px 56px -14px rgba(0,0,0,.8), 0 0 0 2px #5b8cff; }
  .phone img { width: 100%; aspect-ratio: 390 / 844; object-fit: cover; object-position: top; border-radius: 22px;
    display: block; background: #fff; }
  footer { display: grid; grid-template-columns: repeat(${Math.max(1, input.deltas.length)}, 1fr); gap: 18px; margin-top: 30px; }
  .delta { background: rgba(255,255,255,.045); box-shadow: inset 0 0 0 1px rgba(255,255,255,.09); border-radius: 14px;
    padding: 16px 22px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .delta span { color: #9aa6cc; font-size: 20px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .delta b { font-size: 38px; line-height: 1; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums;
    white-space: nowrap; }
  .delta em { font-style: normal; font-weight: 600; color: #5b8cff; margin: 0 12px; }
  .accent-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #5b8cff; }
</style></head><body>
  <header>
    <div class="title">
      <p class="eyebrow">glowup <span>· before / after</span></p>
      <h1>${esc(input.name)}</h1>
      <p class="host">${esc(input.host)}</p>
    </div>
    <div class="total"><small>Audit score</small><p><s>${input.before.score}</s><em>→</em>${input.after.score}</p></div>
  </header>
  <main>${panel('Before', input.before, false)}${panel('After', input.after, true)}</main>
  ${deltas ? `<footer>${deltas}</footer>` : ''}
  <div class="accent-bar"></div>
</body></html>`
}

export async function composeProof(
  browser: Browser,
  ws: Workspace,
  slug = 'home',
  label?: string,
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
    host: label ?? (new URL(before.url).host || before.name),
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

export async function compose(opts: {
  url: string
  root: string
  label?: string
}): Promise<string> {
  const ws = workspace(opts.root, siteKey(normalizeUrl(opts.url)))
  return browserSession(async (browser) => {
    const out = await composeProof(browser, ws, 'home', opts.label)
    log.ok(`proof image written to ${out}`)
    return out
  })
}
