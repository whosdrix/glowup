import { describe, expect, it } from 'vitest'
import { extractContact, findHours, findPhones, findSocials } from '../src/lib/contact.js'
import { contentMarkdown, pickSubpages } from '../src/lib/content.js'
import { isSystemDefault, primaryFamily, rankFonts } from '../src/lib/fonts.js'
import { normalizeUrl, pageSlug, siteKey } from '../src/lib/paths.js'

describe('fonts', () => {
  it('skips generic families', () => {
    expect(primaryFamily('-apple-system, "Open Sans", Arial, sans-serif')).toBe('Open Sans')
    expect(primaryFamily('serif')).toBe('serif')
  })

  it('ranks by characters set', () => {
    const ranked = rankFonts([
      { stack: 'Verdana, sans-serif', chars: 300 },
      { stack: '"Times New Roman"', chars: 100 },
    ])
    expect(ranked).toEqual([
      { family: 'Verdana', share: 0.75 },
      { family: 'Times New Roman', share: 0.25 },
    ])
    expect(isSystemDefault('Verdana')).toBe(true)
  })
})

describe('contact', () => {
  it('finds phones in Czech and international formats without matching years', () => {
    const phones = findPhones('Tel: +420 543 210 987, mobil 777 123 456. Založeno 1994 - 2009.')
    expect(phones).toEqual(['+420 543 210 987', '777 123 456'])
  })

  it('dedupes a tel: link and the same number in text', () => {
    expect(findPhones('Call +420 543 210 987', ['tel:+420543210987'])).toEqual(['+420543210987'])
  })

  it('ignores share links', () => {
    expect(
      findSocials([
        'https://www.facebook.com/sharer/sharer.php?u=x',
        'https://www.facebook.com/pekarnahora',
        'https://instagram.com/pekarna',
      ]),
    ).toEqual([
      { network: 'facebook', url: 'https://www.facebook.com/pekarnahora' },
      { network: 'instagram', url: 'https://instagram.com/pekarna' },
    ])
  })

  it('reads opening hours lines in English and Czech', () => {
    expect(findHours(['Po - Pá 6:00 - 18:00', 'Monday 9.00 to 17.00', 'Pečeme od rána'])).toEqual([
      'Po - Pá 6:00 - 18:00',
      'Monday 9.00 to 17.00',
    ])
  })

  it('pulls emails from mailto links and text', () => {
    const c = extractContact({
      text: 'Write to INFO@example.cz or see logo@2x.png',
      lines: [],
      hrefs: ['mailto:sales@example.cz?subject=hi'],
    })
    expect(c.emails).toEqual(['sales@example.cz', 'info@example.cz'])
  })
})

describe('paths', () => {
  it('names a workspace after the host', () => {
    expect(siteKey('https://www.example.com/about')).toBe('example.com')
    expect(siteKey('http://127.0.0.1:4321/')).toBe('127.0.0.1_4321')
  })

  it('adds https to bare domains', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })

  it('makes readable page slugs', () => {
    const home = 'https://example.com/'
    expect(pageSlug('https://example.com/index.html', home)).toBe('page')
    expect(pageSlug('https://example.com/', home)).toBe('home')
    expect(pageSlug('https://example.com/o-nas/tym.html', home)).toBe('o-nas-tym')
  })
})

describe('pickSubpages', () => {
  it('keeps same-origin pages, drops files, anchors and duplicates', () => {
    const pages = pickSubpages(
      'https://example.com/',
      [
        { href: 'https://example.com/' },
        { href: 'https://example.com/index.html' },
        { href: 'https://example.com/about#team' },
        { href: 'https://example.com/about' },
        { href: 'https://example.com/menu.pdf' },
        { href: 'https://other.com/' },
        { href: 'mailto:a@b.cz' },
        { href: 'https://example.com/contact' },
      ],
      4,
    )
    expect(pages).toEqual(['https://example.com/about', 'https://example.com/contact'])
  })
})

describe('contentMarkdown', () => {
  it('renders blocks in order', () => {
    const md = contentMarkdown(
      'Shop',
      [
        {
          slug: 'home',
          url: 'https://x.cz/',
          title: 'Shop',
          description: '',
          blocks: [
            { kind: 'heading', level: 1, text: 'Hello' },
            { kind: 'list', items: ['a', 'b'] },
            { kind: 'cta', text: 'Order', href: '/order' },
            {
              kind: 'table',
              rows: [
                ['Day', 'Open'],
                ['Mon', '9-5'],
              ],
            },
          ],
        },
      ],
      [],
      ['© Shop'],
    )
    expect(md).toContain('### Hello')
    expect(md).toContain('- a\n- b')
    expect(md).toContain('[button: Order](/order)')
    expect(md).toContain('| Day | Open |\n| --- | --- |\n| Mon | 9-5 |')
    expect(md.trim().endsWith('© Shop')).toBe(true)
  })
})
