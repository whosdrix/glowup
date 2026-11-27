export interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  transparent: '#00000000',
}

export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase()
  const named = NAMED[value]
  if (named) return parseColor(named)

  const hex = value.match(/^#([0-9a-f]{3,8})$/)
  if (hex?.[1]) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) {
      h = [...h].map((c) => c + c).join('')
    }
    if (h.length !== 6 && h.length !== 8) return null
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1,
    }
  }

  const fn = value.match(/^rgba?\(([^)]+)\)$/)
  if (fn?.[1]) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    const channel = (p: string) =>
      p.endsWith('%') ? (Number.parseFloat(p) / 100) * 255 : Number.parseFloat(p)
    const alpha = parts[3]
    const a =
      alpha === undefined
        ? 1
        : alpha.endsWith('%')
          ? Number.parseFloat(alpha) / 100
          : Number.parseFloat(alpha)
    const [r, g, b] = parts.slice(0, 3).map(channel) as [number, number, number]
    if ([r, g, b, a].some(Number.isNaN)) return null
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a }
  }

  return null
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function channelLuminance(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Composite a translucent colour over an opaque background. */
export function flatten(top: Rgb, bottom: Rgb): Rgb {
  const a = top.a
  return {
    r: Math.round(top.r * a + bottom.r * (1 - a)),
    g: Math.round(top.g * a + bottom.g * (1 - a)),
    b: Math.round(top.b * a + bottom.b * (1 - a)),
    a: 1,
  }
}

export function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: Math.round(h * 60), s, l }
}

export function isNeutral(c: Rgb): boolean {
  const { s, l } = toHsl(c)
  return s < 0.12 || l < 0.08 || l > 0.96
}

/** Rough perceptual distance (redmean). Good enough to merge near-identical swatches. */
export function distance(a: Rgb, b: Rgb): number {
  const rm = (a.r + b.r) / 2
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
}

export interface Swatch {
  hex: string
  weight: number
  share: number
  neutral: boolean
}

/**
 * Merge weighted colour samples into a short palette. Samples closer than
 * `threshold` collapse into the heavier one.
 */
export function buildPalette(
  samples: { color: string; weight: number }[],
  { threshold = 40, limit = 8 } = {},
): Swatch[] {
  const buckets: { rgb: Rgb; weight: number }[] = []
  for (const sample of samples) {
    const rgb = parseColor(sample.color)
    if (!rgb || rgb.a < 0.5 || sample.weight <= 0) continue
    const opaque = { ...rgb, a: 1 }
    const near = buckets.find((bucket) => distance(bucket.rgb, opaque) < threshold)
    if (near) {
      if (sample.weight > near.weight) near.rgb = opaque
      near.weight += sample.weight
    } else {
      buckets.push({ rgb: opaque, weight: sample.weight })
    }
  }
  const total = buckets.reduce((sum, b) => sum + b.weight, 0) || 1
  return buckets
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((b) => ({
      hex: toHex(b.rgb),
      weight: Math.round(b.weight),
      share: Math.round((b.weight / total) * 1000) / 1000,
      neutral: isNeutral(b.rgb),
    }))
}

/**
 * The brand colour is the most prominent clearly saturated swatch. Large
 * beige or grey backgrounds should not win just because they cover more area.
 */
export function pickAccent(palette: Swatch[]): string | null {
  const scored = palette
    .map((s) => {
      const hsl = toHsl(parseColor(s.hex) as Rgb)
      return { hex: s.hex, hsl, score: Math.sqrt(s.weight) * hsl.s }
    })
    .filter((s) => s.hsl.s >= 0.25 && s.hsl.l >= 0.12 && s.hsl.l <= 0.88)
    .sort((a, b) => b.score - a.score)
  return scored[0]?.hex ?? null
}
