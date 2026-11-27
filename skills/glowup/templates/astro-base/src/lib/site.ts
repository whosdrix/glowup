import type { ImageMetadata } from 'astro'
import data from '../content/site.json'

export interface Link {
  label: string
  href: string
}

export interface Action extends Link {
  style?: 'primary' | 'secondary' | 'link'
}

export interface ImageEntry {
  src: string
  alt: string
  caption?: string
  focus?: string
  width?: number
  height?: number
}

export interface SectionData {
  type: string
  variant?: string
  tone?: 'surface' | 'ink' | 'accent'
  id?: string
  eyebrow?: string
  heading?: string
  intro?: string
  [key: string]: unknown
}

export interface PageData {
  slug: string
  title: string
  description: string
  eyebrow?: string
  intro?: string
  sections: SectionData[]
}

export interface Site {
  meta: {
    lang: string
    url: string
    title: string
    description: string
    ogImage?: string
    themeColor?: string
  }
  business: {
    name: string
    tagline?: string
    logo?: { src: string; alt: string; width: number; height: number }
  }
  nav: Link[]
  cta?: Link
  contact: {
    phone?: string
    email?: string
    address?: string[]
    mapUrl?: string
    note?: string
  }
  hours: { label: string; value: string }[]
  hoursNote?: string
  socials: Link[]
  images: Record<string, ImageEntry>
  home: { sections: SectionData[] }
  pages: PageData[]
  footer: { blurb?: string; links?: Link[]; note?: string }
  /** Every fixed interface word, so a site in another language has nothing hard-coded to hunt for. */
  labels: {
    skip: string
    menu: string
    home: string
    breadcrumb: string
    footerNav: string
    contact: string
    details: string
    phone: string
    email: string
    address: string
    hours: string
    directions: string
    send: string
    notFound: string
  }
}

export const site = data as unknown as Site

const local = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/*.{jpg,jpeg,png,webp,avif,gif,svg}',
  { eager: true },
)

export interface ResolvedImage {
  src: ImageMetadata | string
  alt: string
  caption?: string
  focus: string
  width: number
  height: number
}

/**
 * Look an image up by its key in site.json. A bare file name is read from
 * src/assets/images and optimised at build time. A path starting with "/" or
 * "http" is used as it is and must carry its own width and height.
 */
export function resolveImage(key: string): ResolvedImage {
  const entry = site.images[key]
  if (!entry) throw new Error(`site.json: no image with the key "${key}"`)
  if (typeof entry.alt !== 'string') throw new Error(`site.json: image "${key}" needs alt text (use "" only for decoration)`)
  const focus = entry.focus ?? '50% 50%'

  if (/^(\/|https?:)/.test(entry.src)) {
    if (!entry.width || !entry.height) {
      throw new Error(`site.json: image "${key}" is not in src/assets/images, so it needs width and height`)
    }
    return { src: entry.src, alt: entry.alt, caption: entry.caption, focus, width: entry.width, height: entry.height }
  }

  const found = local[`/src/assets/images/${entry.src}`]
  if (!found) throw new Error(`site.json: image "${key}" points to src/assets/images/${entry.src}, which does not exist`)
  const meta = found.default
  return { src: meta, alt: entry.alt, caption: entry.caption, focus, width: meta.width, height: meta.height }
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Headings may mark one phrase with *asterisks*; it becomes an <em>. */
export function rich(text: string): string {
  return escape(text).replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function plain(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1')
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function isCurrent(href: string, pathname: string): boolean {
  if (href.includes('#')) return false
  const norm = (p: string) => (p.replace(/\/+$/, '') || '/')
  return norm(href) === norm(pathname)
}
