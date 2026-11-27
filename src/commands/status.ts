import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizeUrl, siteKey, workspace } from '../lib/paths.js'
import type { AuditReport } from './audit.js'

/** Report which steps exist on disk, so an interrupted run can pick up where it stopped. */
export async function status(opts: { url: string; root: string }): Promise<string> {
  const ws = workspace(opts.root, siteKey(normalizeUrl(opts.url)))
  const score = async (file: string) => {
    if (!existsSync(file)) return null
    return (JSON.parse(await readFile(file, 'utf8')) as AuditReport).score
  }
  const before = await score(ws.audit)
  const after = await score(ws.auditAfter)
  const steps: [string, boolean, string][] = [
    ['capture', existsSync(join(ws.capture, 'content.json')), ws.capture],
    ['audit', before !== null, before !== null ? `${before}/100` : ws.audit],
    ['direction', existsSync(ws.direction), ws.direction],
    ['build', existsSync(join(ws.site, 'dist', 'index.html')), join(ws.site, 'dist')],
    ['verify', after !== null, after !== null ? `${after}/100` : ws.auditAfter],
    ['proof', existsSync(join(ws.proof, 'before-after.png')), join(ws.proof, 'before-after.png')],
  ]
  const next = steps.find(([, done]) => !done)?.[0] ?? 'done'
  return `${[
    `${ws.base}`,
    ...steps.map(([name, done, detail]) => `  ${done ? '✓' : '·'} ${name.padEnd(10)} ${detail}`),
    `  next: ${next}`,
  ].join('\n')}\n`
}
