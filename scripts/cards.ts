import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const base = process.env.CARDSHOT_URL ?? 'http://localhost:3000'
const out = join(import.meta.dirname, '..', '.github', 'assets')

interface Card {
  file: string
  params: Record<string, string>
}

const step = (n: number, slug: string, title: string, subtitle: string): Card => ({
  file: `step-${n}-${slug}.png`,
  params: { template: 'basic', title, subtitle, site: `glowup · step ${n} of 4` },
})

const cards: Card[] = [
  {
    file: 'social-preview.png',
    params: {
      template: 'repo',
      owner: 'whosdrix',
      name: 'glowup',
      description:
        'Give it a URL, get back a redesigned site with before/after proof. An agent skill for Claude Code and Codex.',
      language: 'TypeScript',
      languageColor: '3178c6',
    },
  },
  step(
    1,
    'capture',
    'Capture the live site',
    'Desktop and phone screenshots, every word in reading order, the photos, logo, colours, fonts and opening hours.',
  ),
  step(
    2,
    'audit',
    'Audit it out of 100',
    'Contrast failures, smallest text, line length, tap targets, missing alt text, sideways scroll and page weight.',
  ),
  step(
    3,
    'rebuild',
    'Rebuild it in one direction',
    'Pick one of three art directions. An Astro and Tailwind site is built from the real content, nothing invented.',
  ),
  step(
    4,
    'verify',
    'Verify, then prove it',
    'The same audit runs on the new site. It must reach 90 with nothing worse, then you get a before/after image.',
  ),
]

async function render(card: Card): Promise<void> {
  const query = new URLSearchParams({ ...card.params, scale: '2' })
  const res = await fetch(`${base}/og?${query}`)
  if (!res.ok) throw new Error(`${card.file}: cardshot answered ${res.status} ${await res.text()}`)
  await writeFile(join(out, card.file), Buffer.from(await res.arrayBuffer()))
  console.log(`${card.file} written`)
}

await mkdir(out, { recursive: true })
for (const card of cards) await render(card)
