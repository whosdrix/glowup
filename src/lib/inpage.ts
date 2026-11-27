// Functions in this file are serialised and run inside the page with
// page.evaluate, so they must not reference anything outside their own body.

export interface RawBlock {
  kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'image' | 'cta' | 'table'
  text?: string
  level?: number
  items?: string[]
  rows?: string[][]
  src?: string
  alt?: string | null
  href?: string
}

export interface RawImage {
  src: string
  alt: string | null
  width: number
  height: number
  role: 'logo' | 'content' | 'background'
}

export interface RawPage {
  url: string
  title: string
  description: string
  lang: string
  ogImage: string | null
  themeColor: string | null
  favicon: string | null
  nav: { text: string; href: string }[]
  blocks: RawBlock[]
  footer: string[]
  images: RawImage[]
  logo: { src: string; alt: string | null } | null
  hrefs: string[]
  text: string
  lines: string[]
  address: string | null
  jsonld: unknown[]
  colorSamples: { color: string; weight: number; kind: 'bg' | 'text' }[]
  fontSamples: { stack: string; chars: number; heading: boolean }[]
  forms: { action: string; fields: string[] }[]
}

export function extractPage(): RawPage {
  const SKIP = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'SVG',
    'IFRAME',
    'OBJECT',
    'HEAD',
  ])
  const INLINE = new Set([
    'A',
    'ABBR',
    'B',
    'BR',
    'CITE',
    'CODE',
    'EM',
    'FONT',
    'I',
    'MARK',
    'Q',
    'S',
    'SMALL',
    'SPAN',
    'STRONG',
    'SUB',
    'SUP',
    'TIME',
    'U',
    'WBR',
    'BIG',
    'STRIKE',
    'TT',
    'LABEL',
  ])
  const abs = (u: string | null | undefined) => {
    if (!u) return ''
    try {
      return new URL(u, location.href).href
    } catch {
      return ''
    }
  }
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
  const visible = (el: Element) => {
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)
      return false
    const r = el.getBoundingClientRect()
    return r.width > 1 && r.height > 1
  }
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? null

  const blocks: RawBlock[] = []
  const images: RawImage[] = []
  const seenImages = new Set<string>()
  const isLogoish = (el: Element) =>
    /logo|brand/i.test(
      `${el.className} ${el.id} ${el.getAttribute('alt') ?? ''} ${el.getAttribute('src') ?? ''}`,
    )

  let logo: RawPage['logo'] = null
  const logoCandidate =
    document.querySelector(
      'header img, [class*="logo" i] img, img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i], img[src*="logo" i]',
    ) ??
    document.querySelector(
      `a[href="/"] img, a[href="${location.origin}/"] img, a[href="index.html"] img`,
    )
  if (logoCandidate instanceof HTMLImageElement && visible(logoCandidate)) {
    logo = {
      src: abs(logoCandidate.currentSrc || logoCandidate.src),
      alt: logoCandidate.getAttribute('alt'),
    }
  }

  const addImage = (img: HTMLImageElement) => {
    const src = abs(img.currentSrc || img.src)
    if (!src || seenImages.has(src)) return
    const r = img.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) return
    seenImages.add(src)
    images.push({
      src,
      alt: img.getAttribute('alt'),
      width: Math.round(r.width),
      height: Math.round(r.height),
      role: isLogoish(img) || (logo && logo.src === src) ? 'logo' : 'content',
    })
    blocks.push({ kind: 'image', src, alt: img.getAttribute('alt') })
  }

  const isButtonLike = (el: Element) => {
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return true
    if (el.tagName !== 'A') return false
    const s = getComputedStyle(el)
    const bg = s.backgroundColor
    const hasBg = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'
    const padded = Number.parseFloat(s.paddingLeft) >= 4 && Number.parseFloat(s.paddingTop) >= 2
    return (
      (hasBg || s.borderStyle !== 'none') &&
      padded &&
      /block|flex|inline-block|grid/.test(s.display)
    )
  }

  const allInline = (el: Element): boolean => {
    for (const child of Array.from(el.children)) {
      if (!INLINE.has(child.tagName) && child.tagName !== 'IMG') return false
      if (child.tagName === 'IMG') return false
      if (!allInline(child)) return false
    }
    return true
  }

  const isNav = (el: Element) => el.tagName === 'NAV' || el.getAttribute('role') === 'navigation'
  const isFooter = (el: Element) =>
    el.tagName === 'FOOTER' || el.getAttribute('role') === 'contentinfo'

  const walk = (el: Element) => {
    if (SKIP.has(el.tagName.toUpperCase())) return
    if (isNav(el) || isFooter(el)) return
    if (!visible(el)) {
      // Background images on hidden wrappers are not worth keeping, but a
      // zero-height wrapper can still hold visible children.
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden') return
    }
    const bgImage = getComputedStyle(el).backgroundImage
    if (bgImage?.startsWith('url(')) {
      const m = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
      const src = abs(m?.[1])
      const r = el.getBoundingClientRect()
      if (src && !seenImages.has(src) && r.width > 200 && r.height > 120) {
        seenImages.add(src)
        images.push({
          src,
          alt: null,
          width: Math.round(r.width),
          height: Math.round(r.height),
          role: 'background',
        })
      }
    }
    const tag = el.tagName
    if (/^H[1-6]$/.test(tag)) {
      const text = clean((el as HTMLElement).innerText)
      if (text) blocks.push({ kind: 'heading', level: Number(tag[1]), text })
      return
    }
    if (tag === 'IMG') {
      addImage(el as HTMLImageElement)
      return
    }
    if (tag === 'PICTURE' || tag === 'FIGURE') {
      for (const img of Array.from(el.querySelectorAll('img'))) addImage(img)
      const cap = el.querySelector('figcaption')
      if (cap) blocks.push({ kind: 'paragraph', text: clean((cap as HTMLElement).innerText) })
      return
    }
    if (tag === 'UL' || tag === 'OL' || tag === 'DL') {
      const items = Array.from(el.querySelectorAll(':scope > li, :scope > dt, :scope > dd'))
        .map((li) => clean((li as HTMLElement).innerText))
        .filter(Boolean)
      for (const img of Array.from(el.querySelectorAll('img'))) addImage(img)
      if (items.length) blocks.push({ kind: 'list', items })
      return
    }
    if (tag === 'BLOCKQUOTE') {
      blocks.push({ kind: 'quote', text: clean((el as HTMLElement).innerText) })
      return
    }
    if (
      tag === 'TABLE' &&
      el.querySelector(':scope > tr > th, :scope > thead > tr > th, :scope > tbody > tr > th')
    ) {
      const rows = Array.from(el.querySelectorAll('tr'))
        .map((tr) => Array.from(tr.children).map((c) => clean((c as HTMLElement).innerText)))
        .filter((r) => r.some(Boolean))
      blocks.push({ kind: 'table', rows })
      return
    }
    if (tag === 'FORM') {
      return
    }
    if (
      (tag === 'A' || tag === 'BUTTON' || el.getAttribute('role') === 'button') &&
      isButtonLike(el)
    ) {
      const text = clean((el as HTMLElement).innerText)
      if (text) blocks.push({ kind: 'cta', text, href: abs(el.getAttribute('href')) || undefined })
      return
    }
    if (tag === 'P' || (el.childElementCount === 0 && clean(el.textContent)) || allInline(el)) {
      const text = clean((el as HTMLElement).innerText)
      if (text.length > 1) {
        const onlyLink =
          el.children.length === 1 &&
          el.children[0]?.tagName === 'A' &&
          clean(el.children[0]?.textContent) === text
        const a = el.querySelector('a')
        const anchors = Array.from(el.querySelectorAll('a'))
        const linkText = anchors.reduce((n, x) => n + clean(x.textContent).length, 0)
        const navLike = anchors.length >= 3 && linkText / text.length > 0.6
        if (onlyLink && a && isButtonLike(a))
          blocks.push({ kind: 'cta', text, href: abs(a.getAttribute('href')) })
        else if (!navLike) blocks.push({ kind: 'paragraph', text })
      }
      for (const img of Array.from(el.querySelectorAll('img'))) addImage(img)
      return
    }
    walkMixed(el)
  }

  // Old table layouts mix bare text, inline tags and blocks in one cell.
  // Collect inline runs into paragraphs and walk the blocks between them.
  const walkMixed = (el: Element) => {
    let buffer = ''
    let linkChars = 0
    let links = 0
    const flush = () => {
      const text = clean(buffer)
      const navLike = links >= 3 && linkChars / Math.max(1, text.length) > 0.6
      if (text.length > 1 && !navLike) blocks.push({ kind: 'paragraph', text })
      buffer = ''
      linkChars = 0
      links = 0
    }
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) {
        buffer += node.textContent ?? ''
        continue
      }
      if (node.nodeType !== 1) continue
      const child = node as Element
      if (child.tagName === 'BR') {
        buffer += '\n'
        continue
      }
      if (INLINE.has(child.tagName) && !child.querySelector('img') && !isButtonLike(child)) {
        if (!visible(child)) continue
        const t = (child as HTMLElement).innerText ?? ''
        if (child.tagName === 'A') {
          links++
          linkChars += clean(t).length
        }
        buffer += t
        continue
      }
      flush()
      walk(child)
    }
    flush()
  }
  walk(document.body)

  const navRoots = Array.from(document.querySelectorAll('nav, [role="navigation"]'))
  let navLinks = navRoots.flatMap((n) => Array.from(n.querySelectorAll('a')))
  if (navLinks.length < 2) {
    const groups = Array.from(document.querySelectorAll('ul, ol, table, div, td, p'))
      .filter((g) => g.getBoundingClientRect().top < 500)
      .map((g) =>
        Array.from(g.querySelectorAll('a')).filter(
          (a) =>
            a.closest('ul, ol, table, div, td, p') === g ||
            g.tagName === 'UL' ||
            g.tagName === 'OL',
        ),
      )
      .filter((links) => links.length >= 3)
    navLinks = groups[0] ?? navLinks
  }
  const nav = navLinks
    .filter((a) => visible(a) || a.closest('nav'))
    .map((a) => ({ text: clean(a.innerText || a.textContent), href: abs(a.getAttribute('href')) }))
    .filter((l) => l.text && l.href)
    .filter((l, i, arr) => arr.findIndex((x) => x.href === l.href && x.text === l.text) === i)

  const footerEl = document.querySelector('footer, [role="contentinfo"]') as HTMLElement | null
  const footer = footerEl ? footerEl.innerText.split('\n').map(clean).filter(Boolean) : []

  const colorSamples: RawPage['colorSamples'] = []
  const fontSamples: RawPage['fontSamples'] = []
  const vw = window.innerWidth
  const all = Array.from(document.querySelectorAll('body, body *')).slice(0, 4000)
  for (const el of all) {
    if (SKIP.has(el.tagName.toUpperCase())) continue
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (
      s.backgroundColor &&
      s.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      s.backgroundColor !== 'transparent'
    ) {
      const area = Math.min(r.width, vw) * Math.min(r.height, 2000)
      colorSamples.push({ color: s.backgroundColor, weight: area / 1000, kind: 'bg' })
    }
    let direct = 0
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) direct += clean(node.textContent).length
    }
    if (direct > 0) {
      const size = Number.parseFloat(s.fontSize)
      colorSamples.push({ color: s.color, weight: (direct * size * size) / 400, kind: 'text' })
      fontSamples.push({ stack: s.fontFamily, chars: direct, heading: /^H[1-6]$/.test(el.tagName) })
    }
  }
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor
  const bodyBg = getComputedStyle(document.body).backgroundColor
  if (bodyBg === 'rgba(0, 0, 0, 0)' && htmlBg === 'rgba(0, 0, 0, 0)') {
    colorSamples.push({ color: 'rgb(255, 255, 255)', weight: (vw * 2000) / 1000, kind: 'bg' })
  }

  const jsonld: unknown[] = []
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      jsonld.push(JSON.parse(s.textContent ?? ''))
    } catch {}
  }

  const forms = Array.from(document.querySelectorAll('form')).map((f) => ({
    action: abs(f.getAttribute('action')),
    fields: Array.from(f.querySelectorAll('input, textarea, select'))
      .filter(
        (i) =>
          (i as HTMLInputElement).type !== 'hidden' && (i as HTMLInputElement).type !== 'submit',
      )
      .map((i) => {
        const id = i.getAttribute('id')
        const label = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
          : i.closest('label')
        return (
          clean(label?.textContent) ||
          i.getAttribute('placeholder') ||
          i.getAttribute('name') ||
          i.tagName.toLowerCase()
        )
      }),
  }))

  const text = document.body.innerText
  const addressEl = document.querySelector('address, [itemprop="address"]') as HTMLElement | null
  const favicon = document.querySelector('link[rel~="icon"]')?.getAttribute('href')

  return {
    url: location.href,
    title: clean(document.title),
    description: meta('meta[name="description"]') ?? '',
    lang: document.documentElement.lang || '',
    ogImage: abs(meta('meta[property="og:image"]')) || null,
    themeColor: meta('meta[name="theme-color"]'),
    favicon: favicon ? abs(favicon) : null,
    nav,
    blocks: blocks.filter(
      (b, i) =>
        !(
          b.kind === 'paragraph' &&
          blocks[i - 1]?.kind === 'paragraph' &&
          blocks[i - 1]?.text === b.text
        ),
    ),
    footer,
    images,
    logo,
    hrefs: Array.from(document.querySelectorAll('a[href]'))
      .map((a) => abs(a.getAttribute('href')))
      .filter(Boolean),
    text,
    lines: text.split('\n').map(clean).filter(Boolean),
    address: addressEl ? clean(addressEl.innerText) : null,
    jsonld,
    colorSamples,
    fontSamples,
    forms,
  }
}

export interface RawMeasure {
  minFontSize: number
  smallTextShare: number
  lineLength: number
  smallTapTargets: { selector: string; width: number; height: number }[]
  horizontalOverflow: boolean
  viewportMeta: boolean
  fontFamilies: number
  textColors: number
  h1Count: number
  missingAlt: { selector: string; src: string }[]
  layoutShift: number
}

export function measurePage(): RawMeasure {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG'])
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
  const visible = (el: Element) => {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 1 && r.height > 1
  }
  const selectorFor = (el: Element): string => {
    const parts: string[] = []
    let cur: Element | null = el
    while (cur && cur !== document.body && parts.length < 4) {
      if (cur.id) {
        parts.unshift(`#${CSS.escape(cur.id)}`)
        break
      }
      let part = cur.tagName.toLowerCase()
      const cls = Array.from(cur.classList).slice(0, 2)
      if (cls.length) part += `.${cls.map((c) => CSS.escape(c)).join('.')}`
      const parent: Element | null = cur.parentElement
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === cur?.tagName)
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(cur) + 1})`
      }
      parts.unshift(part)
      cur = parent
    }
    return parts.join(' > ')
  }

  let minFontSize = Number.POSITIVE_INFINITY
  let smallChars = 0
  let totalChars = 0
  const families = new Set<string>()
  const colors = new Set<string>()
  const lineLengths: number[] = []

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (SKIP.has(el.tagName)) continue
    let direct = ''
    for (const n of Array.from(el.childNodes)) if (n.nodeType === 3) direct += n.textContent ?? ''
    const chars = clean(direct).length
    if (chars < 2 || !visible(el)) continue
    const s = getComputedStyle(el)
    const size = Number.parseFloat(s.fontSize)
    minFontSize = Math.min(minFontSize, size)
    totalChars += chars
    if (size < 14) smallChars += chars
    families.add((s.fontFamily.split(',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase())
    colors.add(s.color)
  }

  for (const el of Array.from(document.querySelectorAll('p, li, dd, td, blockquote, div'))) {
    const text = clean((el as HTMLElement).innerText)
    if (text.length < 160 || !visible(el)) continue
    if (el.tagName === 'DIV' || el.tagName === 'TD') {
      if (el.querySelector('p, div, li, td, h1, h2, h3, ul, table')) continue
    }
    const range = document.createRange()
    range.selectNodeContents(el)
    const tops = new Set<number>()
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width > 0) tops.add(Math.round(rect.top))
    }
    const lines = Math.max(1, tops.size)
    if (lines < 2) continue
    lineLengths.push(Math.round(text.length / lines))
  }
  lineLengths.sort((a, b) => a - b)
  const p90 = lineLengths.length
    ? (lineLengths[Math.floor((lineLengths.length - 1) * 0.9)] ?? 0)
    : 0

  const targets: RawMeasure['smallTapTargets'] = []
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [onclick]',
  )
  for (const el of Array.from(interactive)) {
    if (!visible(el)) continue
    let r = el.getBoundingClientRect()
    for (const media of Array.from(el.querySelectorAll('img, svg, picture'))) {
      const m = media.getBoundingClientRect()
      if (m.width * m.height > r.width * r.height) r = m
    }
    if (r.width >= 24 && r.height >= 24) continue
    if (el.tagName === 'A') {
      const parent = el.parentElement
      const parentText = clean(parent?.textContent)
      const ownText = clean(el.textContent)
      if (
        parent &&
        /^(P|LI|TD|DD|SPAN|BLOCKQUOTE|ADDRESS)$/.test(parent.tagName) &&
        parentText.length > ownText.length + 10
      )
        continue
    }
    targets.push({
      selector: selectorFor(el),
      width: Math.round(r.width),
      height: Math.round(r.height),
    })
  }

  const missingAlt = Array.from(document.querySelectorAll('img'))
    .filter((img) => !img.hasAttribute('alt') && visible(img))
    .map((img) => ({ selector: selectorFor(img), src: img.currentSrc || img.src }))

  const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
  const shifts = (window as unknown as { __glowupShift?: number }).__glowupShift ?? 0

  return {
    minFontSize: Number.isFinite(minFontSize) ? Math.round(minFontSize * 10) / 10 : 16,
    smallTextShare: totalChars ? Math.round((smallChars / totalChars) * 1000) / 1000 : 0,
    lineLength: p90,
    smallTapTargets: targets,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    viewportMeta: /width\s*=\s*device-width/.test(viewport),
    fontFamilies: families.size,
    textColors: colors.size,
    h1Count: Array.from(document.querySelectorAll('h1')).filter(visible).length,
    missingAlt,
    layoutShift: Math.round(shifts * 1000) / 1000,
  }
}

export const LAYOUT_SHIFT_INIT = `
(() => {
  window.__glowupShift = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__glowupShift += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
`
