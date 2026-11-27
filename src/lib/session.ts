import type { Browser } from 'playwright-core'
import { launchBrowser } from './browser.js'

export async function browserSession<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const { browser } = await launchBrowser()
  try {
    return await fn(browser)
  } finally {
    await browser.close()
  }
}
