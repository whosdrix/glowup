import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export function siteKey(input: string): string {
  const url = new URL(input)
  if (url.protocol === 'file:') {
    const parts = url.pathname.split('/').filter(Boolean)
    const last = parts.at(-1) === 'index.html' ? parts.at(-2) : parts.at(-1)
    return (last ?? 'local').replace(/\.html?$/, '')
  }
  const host = url.hostname.replace(/^www\./, '')
  return url.port ? `${host}_${url.port}` : host
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (/^[a-z]+:\/\//i.test(trimmed)) return new URL(trimmed).href
  if (trimmed.startsWith('/') || trimmed.startsWith('.')) {
    return new URL(`file://${resolve(trimmed)}`).href
  }
  return new URL(`https://${trimmed}`).href
}

export function workspace(root: string, key: string) {
  const base = resolve(root, key)
  return {
    base,
    capture: join(base, 'capture'),
    after: join(base, 'after'),
    site: join(base, 'site'),
    proof: join(base, 'proof'),
    audit: join(base, 'audit.json'),
    auditMd: join(base, 'audit.md'),
    auditAfter: join(base, 'audit-after.json'),
    auditAfterMd: join(base, 'audit-after.md'),
    direction: join(base, 'direction.md'),
  }
}

export type Workspace = ReturnType<typeof workspace>

export async function ensureDir(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true })
  return dir
}

export function pageSlug(url: string, home: string): string {
  const u = new URL(url)
  const h = new URL(home)
  if (u.pathname === h.pathname || u.pathname === '/' || u.pathname === '') return 'home'
  return (
    u.pathname
      .replace(/\/index\.html?$/, '')
      .replace(/\.html?$/, '')
      .split('/')
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 60) || 'page'
  )
}
