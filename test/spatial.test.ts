import { describe, expect, it } from 'vitest'
import { Repeater } from '../src/renderer/lib/gamepad'
import { pickNext, type Rect } from '../src/renderer/lib/spatial'

// A 3×3 grid of 100×150 covers with 20px gaps, named by row/column ("r0c0" … "r2c2").
const grid = [0, 1, 2].flatMap((row) =>
  [0, 1, 2].map((col) => {
    const rect: Rect = { left: col * 120, top: row * 170, right: col * 120 + 100, bottom: row * 170 + 150 }
    return { item: `r${row}c${col}`, rect }
  })
)
const at = (name: string): Rect => grid.find((g) => g.item === name)!.rect

describe('spatial navigation', () => {
  it('moves to the neighbour in each direction', () => {
    expect(pickNext(at('r1c1'), grid, 'right')).toBe('r1c2')
    expect(pickNext(at('r1c1'), grid, 'left')).toBe('r1c0')
    expect(pickNext(at('r1c1'), grid, 'down')).toBe('r2c1')
    expect(pickNext(at('r1c1'), grid, 'up')).toBe('r0c1')
  })

  it('returns null at the edges, and left/right never leave the row', () => {
    expect(pickNext(at('r0c2'), grid, 'right')).toBeNull()
    expect(pickNext(at('r1c0'), grid, 'left')).toBeNull()
    expect(pickNext(at('r2c1'), grid, 'down')).toBeNull()
  })

  it('prefers the same column over a nearer diagonal', () => {
    const items = [
      { item: 'diagonal', rect: { left: 130, top: 160, right: 230, bottom: 310 } },
      { item: 'below', rect: { left: 0, top: 200, right: 100, bottom: 350 } }
    ]
    expect(pickNext(at('r0c0'), items, 'down')).toBe('below')
  })

  it('reaches a toolbar button above the first row', () => {
    const items = [...grid, { item: 'filter', rect: { left: 200, top: -60, right: 280, bottom: -30 } }]
    expect(pickNext(at('r0c2'), items, 'up')).toBe('filter')
  })
})

describe('button repeat', () => {
  it('fires on press, waits, then repeats while held', () => {
    const r = new Repeater(380, 110)
    expect(r.update(true, 0)).toBe(true)
    expect(r.update(true, 100)).toBe(false)
    expect(r.update(true, 379)).toBe(false)
    expect(r.update(true, 390)).toBe(true)
    expect(r.update(true, 450)).toBe(false)
    expect(r.update(true, 501)).toBe(true)
    expect(r.update(false, 520)).toBe(false)
    expect(r.update(true, 530)).toBe(true)
  })
})
