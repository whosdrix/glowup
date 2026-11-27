export interface Finding {
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  count: number
  help: string
  targets: string[]
}

export interface PageMetrics {
  url: string
  slug: string
  contrastErrors: number
  a11yViolations: Finding[]
  missingAlt: number
  minFontSize: number
  smallTextShare: number
  lineLength: number
  smallTapTargets: number
  horizontalOverflow: boolean
  viewportMeta: boolean
  layoutShift: number
  pageWeight: number
  requests: number
  fontFamilies: number
  textColors: number
  h1Count: number
}

export interface Penalty {
  metric: keyof PageMetrics
  points: number
  reason: string
}

export interface PageScore {
  score: number
  penalties: Penalty[]
}

const MB = 1024 * 1024

function capped(per: number, count: number, cap: number): number {
  return Math.min(cap, per * count)
}

/**
 * Turn raw page metrics into a 0-100 score. Every deduction is listed so the
 * report can explain where points went.
 */
export function scorePage(m: PageMetrics): PageScore {
  const p: Penalty[] = []
  const add = (metric: keyof PageMetrics, points: number, reason: string) => {
    if (points > 0) p.push({ metric, points: Math.round(points * 10) / 10, reason })
  }

  add(
    'contrastErrors',
    capped(2, m.contrastErrors, 20),
    `${m.contrastErrors} text elements fail WCAG AA contrast`,
  )

  const other = m.a11yViolations.filter(
    (v) => v.rule !== 'color-contrast' && v.rule !== 'image-alt',
  )
  const a11yPoints = other.reduce(
    (sum, v) => sum + (v.impact === 'critical' || v.impact === 'serious' ? 3 : 1),
    0,
  )
  add('a11yViolations', Math.min(15, a11yPoints), `${other.length} other accessibility rules fail`)

  add('missingAlt', capped(1, m.missingAlt, 8), `${m.missingAlt} images have no alt text`)

  if (m.minFontSize < 12) add('minFontSize', 6, `smallest text is ${m.minFontSize}px on mobile`)
  else if (m.minFontSize < 14)
    add('minFontSize', 2, `smallest text is ${m.minFontSize}px on mobile`)

  if (m.smallTextShare > 0.25)
    add('smallTextShare', 6, `${pct(m.smallTextShare)} of mobile text is under 14px`)
  else if (m.smallTextShare > 0.1)
    add('smallTextShare', 3, `${pct(m.smallTextShare)} of mobile text is under 14px`)

  if (m.lineLength > 95) add('lineLength', 6, `paragraphs run ${m.lineLength} characters per line`)
  else if (m.lineLength > 80)
    add('lineLength', 3, `paragraphs run ${m.lineLength} characters per line`)

  add(
    'smallTapTargets',
    capped(1, m.smallTapTargets, 10),
    `${m.smallTapTargets} tap targets are smaller than 24px`,
  )

  if (m.horizontalOverflow) add('horizontalOverflow', 10, 'the page scrolls sideways on a phone')
  if (!m.viewportMeta) add('viewportMeta', 10, 'no responsive viewport meta tag')

  if (m.layoutShift > 0.25) add('layoutShift', 8, `layout shift score ${m.layoutShift}`)
  else if (m.layoutShift > 0.1) add('layoutShift', 4, `layout shift score ${m.layoutShift}`)

  if (m.pageWeight > 5 * MB) add('pageWeight', 8, `page weighs ${mb(m.pageWeight)}`)
  else if (m.pageWeight > 2.5 * MB) add('pageWeight', 4, `page weighs ${mb(m.pageWeight)}`)
  else if (m.pageWeight > 1.5 * MB) add('pageWeight', 2, `page weighs ${mb(m.pageWeight)}`)

  if (m.fontFamilies > 3) add('fontFamilies', 3, `${m.fontFamilies} font families in use`)
  if (m.textColors > 10) add('textColors', 3, `${m.textColors} different text colours`)
  if (m.h1Count !== 1) add('h1Count', 2, `${m.h1Count} h1 headings (expected one)`)

  const lost = p.reduce((sum, x) => sum + x.points, 0)
  return { score: Math.max(0, Math.round(100 - lost)), penalties: p }
}

export function siteScore(pages: PageScore[]): number {
  if (pages.length === 0) return 0
  const [home, ...rest] = pages
  if (!home) return 0
  if (rest.length === 0) return home.score
  const restAvg = rest.reduce((s, x) => s + x.score, 0) / rest.length
  return Math.round(home.score * 0.5 + restAvg * 0.5)
}

export interface Totals {
  contrastErrors: number
  a11yViolations: number
  missingAlt: number
  minFontSize: number
  lineLength: number
  smallTapTargets: number
  horizontalOverflow: number
  layoutShift: number
  pageWeight: number
}

export function totals(pages: PageMetrics[]): Totals {
  const sum = (f: (m: PageMetrics) => number) => pages.reduce((s, m) => s + f(m), 0)
  return {
    contrastErrors: sum((m) => m.contrastErrors),
    a11yViolations: sum((m) => m.a11yViolations.filter((v) => v.rule !== 'color-contrast').length),
    missingAlt: sum((m) => m.missingAlt),
    minFontSize: pages.length ? Math.min(...pages.map((m) => m.minFontSize)) : 0,
    lineLength: pages.length ? Math.max(...pages.map((m) => m.lineLength)) : 0,
    smallTapTargets: sum((m) => m.smallTapTargets),
    horizontalOverflow: sum((m) => (m.horizontalOverflow ? 1 : 0)),
    layoutShift: pages.length ? Math.max(...pages.map((m) => m.layoutShift)) : 0,
    pageWeight: sum((m) => m.pageWeight),
  }
}

/** For each total, which direction counts as better. */
export const BETTER: Record<keyof Totals, 'lower' | 'higher'> = {
  contrastErrors: 'lower',
  a11yViolations: 'lower',
  missingAlt: 'lower',
  minFontSize: 'higher',
  lineLength: 'lower',
  smallTapTargets: 'lower',
  horizontalOverflow: 'lower',
  layoutShift: 'lower',
  pageWeight: 'lower',
}

export const LABELS: Record<keyof Totals, string> = {
  contrastErrors: 'Contrast errors',
  a11yViolations: 'Accessibility issues',
  missingAlt: 'Images without alt',
  minFontSize: 'Smallest text (px)',
  lineLength: 'Longest line (chars)',
  smallTapTargets: 'Tiny tap targets',
  horizontalOverflow: 'Pages that scroll sideways',
  layoutShift: 'Layout shift',
  pageWeight: 'Page weight',
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function mb(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export function formatTotal(key: keyof Totals, value: number): string {
  if (key === 'pageWeight') return mb(value)
  if (key === 'layoutShift') return value.toFixed(2)
  return String(value)
}
