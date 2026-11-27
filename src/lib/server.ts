import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, normalize, resolve } from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

function resolveFile(root: string, urlPath: string): string | null {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0] ?? '/')).replace(
    /^(\.\.[/\\])+/,
    '',
  )
  const base = join(root, clean)
  if (!base.startsWith(root)) return null
  const candidates = [base, join(base, 'index.html'), `${base}.html`]
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null
}

/** A tiny static server with clean URLs, enough to audit a built site. */
export async function serveStatic(
  dir: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  const root = resolve(dir)
  const server: Server = createServer((req, res) => {
    const file = resolveFile(root, req.url ?? '/')
    if (!file) {
      const notFound = join(root, '404.html')
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      if (existsSync(notFound)) createReadStream(notFound).pipe(res)
      else res.end('Not found')
      return
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    createReadStream(file).pipe(res)
  })
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((ok) => server.close(() => ok())),
  }
}
