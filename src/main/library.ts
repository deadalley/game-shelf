import type { Game, ScannedGame } from '@shared/types'
import type { StoreData } from './db/store'

export const COVER_SCHEME = 'gamecover'

export function coverUrl(id: string, file: string): string {
  // The file name changes whenever the cover does, so it doubles as a cache buster.
  const v = file.split(/[\\/]/).pop() ?? ''
  return `${COVER_SCHEME}://g/${encodeURIComponent(id)}?v=${encodeURIComponent(v)}`
}

/** Local cover file for a game: user override first, then the resolved cache. */
export function coverFile(data: StoreData, id: string): string | undefined {
  return data.overrides[id]?.cover ?? data.covers[id]?.file
}

export function customToScanned(data: StoreData): ScannedGame[] {
  return data.customGames.map((c) => ({
    id: c.id,
    service: 'custom',
    name: c.name,
    installed: true,
    launch: { type: 'exe', target: c.exePath, args: c.args },
    installedAt: c.addedAt
  }))
}

/** Applies user overrides to scanned games, producing what the UI shows. */
export function buildGames(data: StoreData): Game[] {
  const disabled = new Set(data.settings.disabledServices)
  const all = [...data.scanned.games.filter((g) => !disabled.has(g.service)), ...customToScanned(data)]
  return all.map((g) => {
    const o = data.overrides[g.id] ?? {}
    const file = coverFile(data, g.id)
    const tracked = o.trackedMinutes ?? 0
    const playtime = g.playtimeMinutes !== undefined || tracked > 0 ? (g.playtimeMinutes ?? 0) + tracked : undefined
    const lastPlayed = Math.max(g.lastPlayed ?? 0, o.lastPlayed ?? 0) || undefined
    return {
      id: g.id,
      service: g.service,
      name: o.name?.trim() || g.name,
      installed: g.installed,
      installPath: g.installPath,
      launch: o.launch ?? g.launch,
      install: g.install,
      coverUrl: file ? coverUrl(g.id, file) : undefined,
      playtimeMinutes: playtime,
      lastPlayed,
      installedAt: g.installedAt,
      collections: o.collections ?? g.collections ?? [],
      hidden: !!o.hidden
    }
  })
}

export function allCollections(data: StoreData, games: Game[]): string[] {
  const set = new Set([...data.userCollections, ...data.scanned.collections])
  for (const g of games) for (const c of g.collections) set.add(c)
  return [...set].sort((a, b) => a.localeCompare(b))
}
