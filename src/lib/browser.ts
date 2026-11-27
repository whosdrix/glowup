import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import { log } from './log.js'

export const PLAYWRIGHT_VERSION = '1.65.1'
export const AXE_VERSION = '4.14.1'

type Playwright = typeof import('playwright-core')

function cacheDir(): string {
  return (
    process.env.GLOWUP_CACHE ??
    join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'glowup')
  )
}

function tryLoad(from: string): Runtime | null {
  try {
    const req = createRequire(from)
    const pw = req('playwright-core') as Playwright
    const axePath = req.resolve('axe-core/axe.min.js')
    return {
      pw,
      cliPath: join(req.resolve('playwright-core/package.json'), '..', 'cli.js'),
      axeSource: readFileSync(axePath, 'utf8'),
    }
  } catch {
    return null
  }
}

interface Runtime {
  pw: Playwright
  cliPath: string
  axeSource: string
}

let loaded: Runtime | null = null

/**
 * playwright-core and axe-core are not bundled. Use the project's copies when
 * they resolve, otherwise install them once into the user cache.
 */
export async function loadRuntime(): Promise<Runtime> {
  if (loaded) return loaded
  loaded = tryLoad(import.meta.url)
  if (loaded) return loaded
  const runtime = join(cacheDir(), 'runtime')
  const anchor = join(runtime, 'package.json')
  loaded = existsSync(anchor) ? tryLoad(anchor) : null
  if (loaded) return loaded
  log.step(`First run: installing playwright-core and axe-core into ${runtime}`)
  await mkdir(runtime, { recursive: true })
  if (!existsSync(anchor)) {
    writeFileSync(anchor, '{"name":"glowup-runtime","private":true}\n')
  }
  execFileSync(
    'npm',
    [
      'install',
      `playwright-core@${PLAYWRIGHT_VERSION}`,
      `axe-core@${AXE_VERSION}`,
      '--no-audit',
      '--no-fund',
      '--silent',
    ],
    { cwd: runtime, stdio: ['ignore', 'ignore', 'inherit'] },
  )
  loaded = tryLoad(anchor)
  if (!loaded) throw new Error('Could not load playwright-core after installing it')
  return loaded
}

async function attempt(
  label: string,
  fn: () => Promise<Browser>,
): Promise<{ browser: Browser; label: string } | null> {
  try {
    return { browser: await fn(), label }
  } catch {
    return null
  }
}

/**
 * Find a browser in this order: CHROMIUM_PATH, Playwright's own download,
 * installed Chrome or Edge, and finally a one-time download of the headless shell.
 */
export async function launchBrowser(): Promise<{ browser: Browser; label: string }> {
  const { pw, cliPath } = await loadRuntime()
  const args = ['--hide-scrollbars', '--font-render-hinting=none']
  const path = process.env.CHROMIUM_PATH
  if (path) {
    return { browser: await pw.chromium.launch({ executablePath: path, args }), label: path }
  }
  const found =
    (await attempt('playwright chromium', () => pw.chromium.launch({ args }))) ??
    (await attempt('Google Chrome', () => pw.chromium.launch({ channel: 'chrome', args }))) ??
    (await attempt('Microsoft Edge', () => pw.chromium.launch({ channel: 'msedge', args })))
  if (found) return found

  log.step('No browser found. Downloading Chromium headless shell (one time, about 100 MB)')
  execFileSync(process.execPath, [cliPath, 'install', '--only-shell', 'chromium'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  return { browser: await pw.chromium.launch({ args }), label: 'playwright chromium' }
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} as const

export type ViewportName = keyof typeof VIEWPORTS

export async function newPage(
  browser: Browser,
  viewport: ViewportName,
): Promise<{ context: BrowserContext; page: Page }> {
  const v = VIEWPORTS[viewport]
  const context = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.deviceScaleFactor,
    isMobile: v.isMobile,
    hasTouch: v.hasTouch,
    reducedMotion: 'reduce',
    userAgent:
      viewport === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        : undefined,
  })
  // Bundlers that keep function names wrap them in __name(), which does not exist in the page.
  await context.addInitScript('globalThis.__name = globalThis.__name || ((f) => f)')
  const page = await context.newPage()
  return { context, page }
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8))
    for (let y = 0; y < document.body.scrollHeight && y < 20_000; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
    await document.fonts.ready
  })
  await page.waitForTimeout(300)
}
