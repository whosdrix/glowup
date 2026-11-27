export interface Contact {
  emails: string[]
  phones: string[]
  socials: { network: string; url: string }[]
  address: string | null
  hours: string[]
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g
const NETWORKS: [string, RegExp][] = [
  ['facebook', /facebook\.com\//i],
  ['instagram', /instagram\.com\//i],
  ['linkedin', /linkedin\.com\//i],
  ['x', /(?:twitter|x)\.com\//i],
  ['youtube', /youtube\.com\/|youtu\.be\//i],
  ['tiktok', /tiktok\.com\//i],
  ['pinterest', /pinterest\.[a-z]+\//i],
]
const DAY =
  /\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|po|út|st|čt|pá|so|ne|pondělí|úterý|středa|čtvrtek|pátek|sobota|neděle)\b/i
const TIME = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b/i
const CLOSED = /\b(closed|zavřeno|zavreno|geschlossen|fermé|by appointment|po domluvě)\b/i
const POSTCODE = [
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/,
  /\b\d{3}\s?\d{2}\s+\p{Lu}\p{Ll}+/u,
  /\b[A-Z]{2}\s\d{5}(?:-\d{4})?\b/,
  /\b\d{5}\s+\p{Lu}\p{Ll}+/u,
]
const STREET = /\p{L}{3,}.*\s\d+[a-z]?\b|\b\d+[a-z]?\s+\p{L}{3,}/u

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function findEmails(text: string, hrefs: string[] = []): string[] {
  const fromLinks = hrefs
    .filter((h) => h.toLowerCase().startsWith('mailto:'))
    .map((h) => decodeURIComponent(h.slice(7).split('?')[0] ?? '').toLowerCase())
  const fromText = (text.match(EMAIL) ?? []).map((e) => e.toLowerCase())
  return unique([...fromLinks, ...fromText]).filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e))
}

export function findPhones(text: string, hrefs: string[] = []): string[] {
  const fromLinks = hrefs
    .filter((h) => h.toLowerCase().startsWith('tel:'))
    .map((h) => decodeURIComponent(h.slice(4)).trim())
  const fromText = (text.match(PHONE) ?? [])
    .map((p) => p.trim())
    .filter((p) => {
      const digits = p.replace(/\D/g, '')
      if (digits.length < 9 || digits.length > 15) return false
      if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(p)) return false
      return /[\s.+()-]/.test(p) || p.startsWith('+')
    })
  const seen = new Set<string>()
  return [...fromLinks, ...fromText].filter((p) => {
    const key = p.replace(/\D/g, '').slice(-9)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function findSocials(hrefs: string[]): { network: string; url: string }[] {
  const out: { network: string; url: string }[] = []
  for (const href of unique(hrefs)) {
    const match = NETWORKS.find(([, re]) => re.test(href))
    if (match && !out.some((o) => o.network === match[0])) {
      if (/sharer|share\?|intent\/tweet/i.test(href)) continue
      out.push({ network: match[0], url: href })
    }
  }
  return out
}

export function findHours(lines: string[]): string[] {
  return unique(
    lines
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length < 120 && DAY.test(l) && (TIME.test(l) || CLOSED.test(l))),
  ).slice(0, 14)
}

function looksLikeStreet(s: string): boolean {
  const rest = POSTCODE.reduce((acc, re) => acc.replace(re, ''), s)
  return STREET.test(rest)
}

/** Best guess at a postal address from visible lines when the page has no address markup. */
export function findAddress(lines: string[]): string | null {
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (line.length > 140 || !POSTCODE.some((re) => re.test(line))) continue
    const parts = line.split(/\s[·|•]\s/).map((p) => p.trim())
    const k = parts.findIndex((p) => POSTCODE.some((re) => re.test(p)))
    const hit = parts[k] ?? line
    if (looksLikeStreet(hit)) return hit
    const before = k > 0 ? parts[k - 1] : lines[i - 1]?.trim()
    if (before && before.length < 60 && looksLikeStreet(before)) return `${before}, ${hit}`
    return hit
  }
  return null
}

export function extractContact(input: {
  text: string
  lines: string[]
  hrefs: string[]
  address?: string | null
}): Contact {
  return {
    emails: findEmails(input.text, input.hrefs),
    phones: findPhones(input.text, input.hrefs),
    socials: findSocials(input.hrefs),
    address: input.address?.replace(/\s+/g, ' ').trim() || findAddress(input.lines),
    hours: findHours(input.lines),
  }
}
