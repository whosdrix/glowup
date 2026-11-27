import { buildPalette, pickAccent, type Swatch } from './colors.js'
import { type Contact, extractContact } from './contact.js'
import { type FontUse, isSystemDefault, rankFonts } from './fonts.js'
import type { RawPage } from './inpage.js'

export interface Brand {
  name: string
  accent: string | null
  themeColor: string | null
  palette: Swatch[]
  backgrounds: Swatch[]
  textColors: Swatch[]
  fonts: {
    heading: FontUse[]
    body: FontUse[]
    systemDefaultsOnly: boolean
  }
  logo: string | null
  favicon: string | null
  contact: Contact
  business: Record<string, unknown> | null
}

const BUSINESS_TYPES =
  /LocalBusiness|Organization|Restaurant|Store|Dentist|Bakery|Cafe|Hotel|Salon|Clinic|Physician|Plumber|Electrician|AutoRepair|LegalService|ProfessionalService|SportsActivityLocation|Corporation/i

function flattenLd(items: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit)
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      out.push(o)
      if (o['@graph']) visit(o['@graph'])
    }
  }
  items.forEach(visit)
  return out
}

export function findBusiness(pages: RawPage[]): Record<string, unknown> | null {
  for (const page of pages) {
    for (const item of flattenLd(page.jsonld)) {
      const type = item['@type']
      const types = Array.isArray(type) ? type.join(' ') : String(type ?? '')
      if (BUSINESS_TYPES.test(types)) return item
    }
  }
  return null
}

const GENERIC_TITLE =
  /^(welcome|home|homepage|index|main page|úvod|domů|vítejte|úvodní stránka|startseite|accueil|inicio)\b/i

export function guessName(home: RawPage, business: Record<string, unknown> | null): string {
  if (business && typeof business.name === 'string') return business.name
  if (home.siteName) return home.siteName
  const parts = home.title
    .split(/\s[|\-–—:·]\s/)
    .map((s) => s.trim())
    .filter((s) => s && !GENERIC_TITLE.test(s))
  const copyright = home.lines.find((l) => /©|\(c\)|copyright/i.test(l)) ?? ''
  const inCopyright = parts.find((p) => copyright.toLowerCase().includes(p.toLowerCase()))
  if (inCopyright) return inCopyright
  const logoAlt = home.logo?.alt?.replace(/\s*logo\s*/i, '').trim()
  if (logoAlt && logoAlt.length < 60) {
    const match = parts.find((p) => p.toLowerCase().includes(logoAlt.toLowerCase()))
    return match ?? logoAlt
  }
  return parts[0] ?? home.title ?? new URL(home.url).hostname
}

function ldAddress(business: Record<string, unknown> | null): string | null {
  const a = business?.address
  if (!a) return null
  if (typeof a === 'string') return a
  if (typeof a === 'object') {
    const o = a as Record<string, unknown>
    return ['streetAddress', 'postalCode', 'addressLocality', 'addressCountry']
      .map((k) => o[k])
      .filter((v): v is string => typeof v === 'string')
      .join(', ')
  }
  return null
}

export function buildBrand(
  pages: RawPage[],
  logoPath: string | null,
  faviconPath: string | null,
): Brand {
  const home = pages[0] as RawPage
  const samples = pages.flatMap((p) => p.colorSamples)
  const palette = buildPalette(samples, { limit: 12 })
  const business = findBusiness(pages)
  const headingSamples = pages.flatMap((p) => p.fontSamples.filter((f) => f.heading))
  const bodySamples = pages.flatMap((p) => p.fontSamples.filter((f) => !f.heading))
  const body = rankFonts(bodySamples).slice(0, 4)
  const heading = rankFonts(headingSamples).slice(0, 3)

  const contact = extractContact({
    text: pages.map((p) => p.text).join('\n'),
    lines: pages.flatMap((p) => p.lines),
    hrefs: pages.flatMap((p) => p.hrefs),
    address: home.address ?? pages.find((p) => p.address)?.address ?? ldAddress(business),
  })
  if (business) {
    const tel = business.telephone
    if (typeof tel === 'string' && !contact.phones.includes(tel)) contact.phones.unshift(tel)
    const email = business.email
    if (typeof email === 'string' && !contact.emails.includes(email)) contact.emails.unshift(email)
    const hours = business.openingHours
    if (contact.hours.length === 0 && hours) {
      contact.hours = (Array.isArray(hours) ? hours : [hours]).map(String)
    }
  }

  return {
    name: guessName(home, business),
    accent:
      pickAccent(
        buildPalette(
          samples.filter((s) => s.kind !== 'page'),
          { limit: 12 },
        ),
      ) ?? pickAccent(palette),
    themeColor: home.themeColor,
    palette,
    backgrounds: buildPalette(
      samples.filter((s) => s.kind !== 'text'),
      { limit: 6 },
    ),
    textColors: buildPalette(
      samples.filter((s) => s.kind === 'text'),
      { limit: 6 },
    ),
    fonts: {
      heading,
      body,
      systemDefaultsOnly: [...heading, ...body].every((f) => isSystemDefault(f.family)),
    },
    logo: logoPath,
    favicon: faviconPath,
    contact,
    business,
  }
}
