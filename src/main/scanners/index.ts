import type { ScanReportEntry, ScannedGame } from '@shared/types'
import { battlenetScanner } from './battlenet'
import { eaScanner } from './ea'
import { epicScanner } from './epic'
import { gogScanner } from './gog'
import { steamScanner } from './steam'
import type { ScanContext, Scanner } from './types'
import { ubisoftScanner } from './ubisoft'
import { xboxScanner } from './xbox'

export const SCANNERS: Scanner[] = [
  steamScanner,
  xboxScanner,
  gogScanner,
  epicScanner,
  eaScanner,
  ubisoftScanner,
  battlenetScanner
]

export interface ScanAllResult {
  games: ScannedGame[]
  collections: string[]
  report: ScanReportEntry[]
}

/** Runs every scanner in parallel. One failing launcher never breaks the others. */
export async function scanAll(ctx: ScanContext, scanners = SCANNERS): Promise<ScanAllResult> {
  const results = await Promise.all(
    scanners.map(async (s) => {
      const start = Date.now()
      try {
        const r = await s.scan(ctx)
        const entry: ScanReportEntry = {
          service: s.service,
          ok: true,
          found: r.games.length,
          message: r.message,
          durationMs: Date.now() - start
        }
        return { r, entry }
      } catch (err) {
        const entry: ScanReportEntry = {
          service: s.service,
          ok: false,
          found: 0,
          message: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start
        }
        return { r: { games: [] as ScannedGame[], collections: [] as string[] }, entry }
      }
    })
  )

  const seen = new Set<string>()
  const games: ScannedGame[] = []
  for (const { r } of results) {
    for (const g of r.games) {
      if (seen.has(g.id)) continue
      seen.add(g.id)
      games.push(g)
    }
  }
  return {
    games,
    collections: [...new Set(results.flatMap(({ r }) => r.collections ?? []))],
    report: results.map((x) => x.entry)
  }
}
