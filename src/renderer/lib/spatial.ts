/**
 * Spatial navigation: given the focused element's box and the boxes of everything focusable,
 * pick the best neighbour in a direction (used for controller D-pad navigation).
 */
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Gap between two ranges on one axis; 0 when they overlap. */
function gap(a1: number, a2: number, b1: number, b2: number): number {
  if (b2 < a1) return a1 - b2
  if (b1 > a2) return b1 - a2
  return 0
}

export function pickNext<T>(from: Rect, candidates: { item: T; rect: Rect }[], dir: Direction): T | null {
  const fcx = (from.left + from.right) / 2
  const fcy = (from.top + from.bottom) / 2
  const horizontal = dir === 'left' || dir === 'right'
  let best: T | null = null
  let bestScore = Infinity

  for (const { item, rect: r } of candidates) {
    const cx = (r.left + r.right) / 2
    const cy = (r.top + r.bottom) / 2
    // Must lie in the pressed direction.
    if (dir === 'right' && cx <= fcx + 1) continue
    if (dir === 'left' && cx >= fcx - 1) continue
    if (dir === 'down' && cy <= fcy + 1) continue
    if (dir === 'up' && cy >= fcy - 1) continue

    const crossGap = horizontal
      ? gap(from.top, from.bottom, r.top, r.bottom)
      : gap(from.left, from.right, r.left, r.right)
    // Left/right only moves within the same row, so the end of a row doesn't jump somewhere unexpected.
    if (horizontal && crossGap > 0) continue

    const primary = Math.max(
      0,
      dir === 'right'
        ? r.left - from.right
        : dir === 'left'
          ? from.left - r.right
          : dir === 'down'
            ? r.top - from.bottom
            : from.top - r.bottom
    )
    const centreOffset = horizontal ? Math.abs(cy - fcy) : Math.abs(cx - fcx)
    // Staying in line (same column / row) matters more than being slightly closer.
    const score = primary + crossGap * 2 + centreOffset * 0.1
    if (score < bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}
