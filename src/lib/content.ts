import type { RawBlock, RawPage } from './inpage.js'

export interface PageContent {
  slug: string
  url: string
  title: string
  description: string
  blocks: RawBlock[]
}

/** A compact, readable dump of every page so the model can work from text, not JSON. */
export function contentMarkdown(
  name: string,
  pages: PageContent[],
  nav: RawPage['nav'],
  footer: string[],
): string {
  const out: string[] = [`# ${name}`, '']
  if (nav.length) {
    out.push('## Navigation', '', ...nav.map((l) => `- ${l.text} → ${l.href}`), '')
  }
  for (const page of pages) {
    out.push(`## Page: ${page.slug}`, '', `URL: ${page.url}`, `Title: ${page.title}`)
    if (page.description) out.push(`Description: ${page.description}`)
    out.push('')
    for (const b of page.blocks) {
      switch (b.kind) {
        case 'heading':
          out.push(`${'#'.repeat(Math.min(6, (b.level ?? 2) + 2))} ${b.text}`, '')
          break
        case 'paragraph':
          out.push(b.text ?? '', '')
          break
        case 'list':
          out.push(...(b.items ?? []).map((i) => `- ${i}`), '')
          break
        case 'quote':
          out.push(`> ${b.text}`, '')
          break
        case 'image':
          out.push(`![${b.alt ?? ''}](${b.src})`, '')
          break
        case 'cta':
          out.push(`[button: ${b.text}](${b.href ?? '#'})`, '')
          break
        case 'table':
          for (const [i, row] of (b.rows ?? []).entries()) {
            out.push(`| ${row.join(' | ')} |`)
            if (i === 0) out.push(`|${row.map(() => ' --- ').join('|')}|`)
          }
          out.push('')
          break
      }
    }
  }
  if (footer.length) out.push('## Footer', '', ...footer, '')
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}

export function pickSubpages(home: string, links: { href: string }[], limit: number): string[] {
  const origin = new URL(home)
  const out: string[] = []
  for (const { href } of links) {
    let u: URL
    try {
      u = new URL(href)
    } catch {
      continue
    }
    if (u.protocol !== origin.protocol || u.host !== origin.host) continue
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|xlsx?|mp4|mp3)$/i.test(u.pathname)) continue
    u.hash = ''
    u.search = ''
    const clean = u.href
    const homeClean = new URL(home)
    homeClean.hash = ''
    homeClean.search = ''
    if (clean === homeClean.href || out.includes(clean)) continue
    if (u.pathname.replace(/index\.html?$/, '') === homeClean.pathname.replace(/index\.html?$/, ''))
      continue
    out.push(clean)
    if (out.length >= limit) break
  }
  return out
}
