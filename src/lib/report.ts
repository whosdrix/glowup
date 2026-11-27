import type { AuditReport } from '../commands/audit.js'
import { BETTER, formatTotal, LABELS, type Totals } from './score.js'

function grade(score: number): string {
  if (score >= 90) return 'good'
  if (score >= 70) return 'needs work'
  if (score >= 50) return 'poor'
  return 'bad'
}

export function auditMarkdown(r: AuditReport): string {
  const out: string[] = [
    `# Audit: ${r.name}`,
    '',
    `**Score ${r.score}/100** (${grade(r.score)}) · ${r.pages.length} pages · ${r.url}`,
    '',
    '| Check | Result |',
    '| --- | --- |',
  ]
  for (const key of Object.keys(LABELS) as (keyof Totals)[]) {
    out.push(`| ${LABELS[key]} | ${formatTotal(key, r.totals[key])} |`)
  }
  out.push('')

  for (const page of r.pages) {
    const m = page.metrics
    out.push(`## ${m.slug} · ${page.score.score}/100`, '', m.url, '')
    if (page.score.penalties.length === 0) {
      out.push('No deductions.', '')
      continue
    }
    for (const p of [...page.score.penalties].sort((a, b) => b.points - a.points)) {
      out.push(`- **−${p.points}** ${p.reason}`)
    }
    out.push('')
    const serious = m.a11yViolations.filter((v) => v.count > 0)
    if (serious.length) {
      out.push('<details><summary>Accessibility rules that fail</summary>', '')
      for (const v of serious) {
        out.push(`- \`${v.rule}\` (${v.impact}, ${v.count}×): ${v.help}`)
        for (const t of v.targets.slice(0, 3)) out.push(`  - \`${t}\``)
      }
      out.push('', '</details>', '')
    }
    if (page.details.smallTapTargets.length) {
      out.push('<details><summary>Small tap targets (mobile)</summary>', '')
      for (const t of page.details.smallTapTargets.slice(0, 8)) {
        out.push(`- \`${t.selector}\` ${t.width}×${t.height}px`)
      }
      out.push('', '</details>', '')
    }
  }
  return `${out.join('\n').trim()}\n`
}

export interface DeltaRow {
  key: keyof Totals
  label: string
  before: string
  after: string
  better: boolean
  worse: boolean
}

export function deltaRows(before: Totals, after: Totals): DeltaRow[] {
  return (Object.keys(LABELS) as (keyof Totals)[]).map((key) => {
    const b = before[key]
    const a = after[key]
    const lowerIsBetter = BETTER[key] === 'lower'
    const tolerance = key === 'pageWeight' ? b * 0.05 : key === 'layoutShift' ? 0.01 : 0
    return {
      key,
      label: LABELS[key],
      before: formatTotal(key, b),
      after: formatTotal(key, a),
      better: lowerIsBetter ? a < b : a > b,
      worse: lowerIsBetter ? a > b + tolerance : a < b - tolerance,
    }
  })
}

export function deltaMarkdown(before: AuditReport, after: AuditReport): string {
  const rows = deltaRows(before.totals, after.totals)
  const out = [
    `# ${before.name}: before and after`,
    '',
    `**Score ${before.score} → ${after.score}**`,
    '',
    '| Check | Before | After |',
    '| --- | --- | --- |',
    ...rows.map(
      (r) => `| ${r.label} | ${r.before} | ${r.after}${r.better ? ' ✓' : r.worse ? ' ✗' : ''} |`,
    ),
    '',
  ]
  return out.join('\n')
}
