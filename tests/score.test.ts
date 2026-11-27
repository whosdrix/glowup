import { describe, expect, it } from 'vitest'
import type { AuditReport } from '../src/commands/audit.js'
import { headlineDeltas } from '../src/commands/compose.js'
import { checkBudget } from '../src/commands/verify.js'
import { deltaRows } from '../src/lib/report.js'
import { type PageMetrics, scorePage, siteScore, totals } from '../src/lib/score.js'

const clean: PageMetrics = {
  url: 'https://x.cz/',
  slug: 'home',
  contrastErrors: 0,
  a11yViolations: [],
  missingAlt: 0,
  minFontSize: 16,
  smallTextShare: 0,
  lineLength: 64,
  smallTapTargets: 0,
  horizontalOverflow: false,
  viewportMeta: true,
  layoutShift: 0,
  pageWeight: 400_000,
  requests: 12,
  fontFamilies: 2,
  textColors: 4,
  h1Count: 1,
}

describe('scorePage', () => {
  it('gives a clean page 100', () => {
    expect(scorePage(clean)).toEqual({ score: 100, penalties: [] })
  })

  it('caps each category so one problem cannot sink the score alone', () => {
    const { score, penalties } = scorePage({ ...clean, contrastErrors: 500 })
    expect(score).toBe(80)
    expect(penalties).toHaveLength(1)
  })

  it('adds up typical problems of an old site', () => {
    const { score } = scorePage({
      ...clean,
      contrastErrors: 11,
      missingAlt: 3,
      minFontSize: 9,
      smallTextShare: 0.21,
      viewportMeta: false,
      lineLength: 117,
      h1Count: 1,
    })
    expect(score).toBe(100 - 20 - 3 - 6 - 3 - 10 - 6)
  })

  it('never goes below zero', () => {
    const { score } = scorePage({
      ...clean,
      contrastErrors: 99,
      missingAlt: 99,
      minFontSize: 8,
      smallTextShare: 1,
      lineLength: 200,
      smallTapTargets: 99,
      horizontalOverflow: true,
      viewportMeta: false,
      layoutShift: 1,
      pageWeight: 50_000_000,
      fontFamilies: 9,
      textColors: 30,
      h1Count: 0,
      a11yViolations: Array.from({ length: 10 }, (_, i) => ({
        rule: `rule-${i}`,
        impact: 'serious' as const,
        count: 1,
        help: '',
        targets: [],
      })),
    })
    expect(score).toBe(0)
  })
})

describe('siteScore', () => {
  it('weights the home page as half the score', () => {
    expect(
      siteScore([
        { score: 40, penalties: [] },
        { score: 80, penalties: [] },
        { score: 100, penalties: [] },
      ]),
    ).toBe(65)
  })
})

function report(score: number, pages: PageMetrics[]): AuditReport {
  return {
    url: 'https://x.cz/',
    name: 'X',
    auditedAt: '',
    score,
    totals: totals(pages),
    pages: pages.map((metrics) => ({
      metrics,
      score: scorePage(metrics),
      details: { smallTapTargets: [], missingAlt: [] },
    })),
  }
}

describe('verify budget', () => {
  const before = report(55, [
    { ...clean, contrastErrors: 11, minFontSize: 9, lineLength: 117, viewportMeta: false },
  ])

  it('passes a clean rebuild', () => {
    expect(checkBudget(before, report(98, [clean]))).toEqual([])
  })

  it('lists every problem in a weak rebuild', () => {
    const failures = checkBudget(
      before,
      report(70, [{ ...clean, contrastErrors: 2, lineLength: 96, h1Count: 2 }]),
    )
    expect(failures).toEqual(
      expect.arrayContaining([
        'score 70 is below 90',
        '2 contrast errors',
        'lines run 96 characters (max 80)',
        'home: 2 h1 headings',
      ]),
    )
  })

  it('flags anything that got worse than the original', () => {
    const failures = checkBudget(
      report(90, [{ ...clean, minFontSize: 16 }]),
      report(95, [{ ...clean, minFontSize: 13 }]),
    )
    expect(failures).toContain('Smallest text (px) got worse: 16 → 13')
  })
})

describe('headlineDeltas', () => {
  it('picks the most telling improvements first', () => {
    const rows = deltaRows(
      totals([
        { ...clean, contrastErrors: 14, smallTapTargets: 6, pageWeight: 3_000_000, minFontSize: 9 },
      ]),
      totals([clean]),
    )
    expect(headlineDeltas(rows, 3).map((r) => `${r.label}: ${r.before} → ${r.after}`)).toEqual([
      'Contrast errors: 14 → 0',
      'Tiny tap targets: 6 → 0',
      'Smallest text (px): 9 → 16',
    ])
  })
})
