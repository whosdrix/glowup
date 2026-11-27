const GENERIC = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  '-apple-system',
  'blinkmacsystemfont',
  'emoji',
  'math',
])

/** First real family in a CSS font-family stack, e.g. `"Open Sans", Arial` -> `Open Sans`. */
export function primaryFamily(stack: string): string {
  const families = stack
    .split(',')
    .map((f) => f.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  return families.find((f) => !GENERIC.has(f.toLowerCase())) ?? families[0] ?? 'serif'
}

export interface FontUse {
  family: string
  share: number
}

export function rankFonts(samples: { stack: string; chars: number }[]): FontUse[] {
  const totals = new Map<string, number>()
  let all = 0
  for (const { stack, chars } of samples) {
    const family = primaryFamily(stack)
    totals.set(family, (totals.get(family) ?? 0) + chars)
    all += chars
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([family, chars]) => ({ family, share: Math.round((chars / (all || 1)) * 1000) / 1000 }))
}

const SYSTEM_DEFAULTS = new Set([
  'times new roman',
  'times',
  'arial',
  'helvetica',
  'verdana',
  'tahoma',
  'georgia',
  'comic sans ms',
  'trebuchet ms',
])

export function isSystemDefault(family: string): boolean {
  return SYSTEM_DEFAULTS.has(family.toLowerCase())
}
