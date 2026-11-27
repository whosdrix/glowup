import { describe, expect, it } from 'vitest'
import {
  buildPalette,
  contrastRatio,
  flatten,
  parseColor,
  pickAccent,
  toHex,
} from '../src/lib/colors.js'

describe('parseColor', () => {
  it('reads hex, short hex and rgb()', () => {
    expect(parseColor('#8b1e1e')).toEqual({ r: 139, g: 30, b: 30, a: 1 })
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 })
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 })
  })

  it('returns null for things it cannot read', () => {
    expect(parseColor('var(--x)')).toBeNull()
    expect(parseColor('#12345')).toBeNull()
  })
})

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    const black = parseColor('#000') as NonNullable<ReturnType<typeof parseColor>>
    const white = parseColor('#fff') as NonNullable<ReturnType<typeof parseColor>>
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1)
    const grey = parseColor('#777777') as NonNullable<ReturnType<typeof parseColor>>
    expect(contrastRatio(grey, white)).toBeCloseTo(4.48, 1)
  })

  it('flattens translucent colours before comparing', () => {
    const half = parseColor('rgba(0,0,0,0.5)') as NonNullable<ReturnType<typeof parseColor>>
    const white = parseColor('#fff') as NonNullable<ReturnType<typeof parseColor>>
    expect(toHex(flatten(half, white))).toBe('#808080')
  })
})

describe('buildPalette', () => {
  it('merges near-identical colours and sorts by weight', () => {
    const palette = buildPalette([
      { color: '#ffffff', weight: 100 },
      { color: '#fefefe', weight: 50 },
      { color: '#8b1e1e', weight: 10 },
      { color: 'rgba(0,0,0,0)', weight: 999 },
    ])
    expect(palette.map((s) => s.hex)).toEqual(['#ffffff', '#8b1e1e'])
    expect(palette[0]?.weight).toBe(150)
    expect(palette[0]?.neutral).toBe(true)
  })
})

describe('pickAccent', () => {
  it('prefers a saturated brand colour over a large beige background', () => {
    const palette = buildPalette([
      { color: '#c9c3b6', weight: 4000 },
      { color: '#777777', weight: 600 },
      { color: '#8b1e1e', weight: 80 },
      { color: '#aa3333', weight: 15 },
    ])
    expect(pickAccent(palette)).toBe('#8b1e1e')
  })

  it('returns null for a greyscale site', () => {
    expect(
      pickAccent(
        buildPalette([
          { color: '#fff', weight: 1 },
          { color: '#333', weight: 1 },
        ]),
      ),
    ).toBeNull()
  })
})
