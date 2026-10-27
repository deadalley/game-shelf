import { isFavoritesCollection } from '@shared/favorites'
import { SERVICES, SERVICE_LABELS, type Game, type Settings, type SortId } from '@shared/types'

export interface ShelfGroup {
  key: string
  title: string
  games: Game[]
  favorite?: boolean
}

export function filterGames(games: Game[], s: Settings, search: string): Game[] {
  const q = search.trim().toLowerCase()
  return games.filter(
    (g) =>
      (s.showHidden || !g.hidden) &&
      (s.services.length === 0 || s.services.includes(g.service)) &&
      (s.installFilter === 'all' || (s.installFilter === 'installed') === g.installed) &&
      (!q || g.name.toLowerCase().includes(q))
  )
}

const byName = (a: Game, b: Game): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

/** Descending by a numeric field; games without data go last, ties fall back to name. */
function desc(field: 'lastPlayed' | 'playtimeMinutes') {
  return (a: Game, b: Game): number => {
    const x = a[field] ?? -1
    const y = b[field] ?? -1
    return y - x || byName(a, b)
  }
}

const SORTERS: Record<SortId, (a: Game, b: Game) => number> = {
  name: byName,
  lastPlayed: desc('lastPlayed'),
  playtime: desc('playtimeMinutes')
}

export function sortGames(games: Game[], sort: SortId): Game[] {
  return [...games].sort(SORTERS[sort])
}

export const UNCATEGORIZED = 'Uncategorized'

export function groupGames(games: Game[], s: Settings): ShelfGroup[] {
  const sorted = sortGames(games, s.sort)
  if (s.group === 'service') {
    return SERVICES.map((svc) => ({
      key: svc,
      title: SERVICE_LABELS[svc],
      games: sorted.filter((g) => g.service === svc)
    })).filter((g) => g.games.length > 0)
  }
  if (s.group === 'collection') {
    const map = new Map<string, Game[]>()
    for (const g of sorted) {
      const cols = g.collections.length ? g.collections : [UNCATEGORIZED]
      for (const c of cols) map.set(c, [...(map.get(c) ?? []), g])
    }
    // Favorites first, Uncategorized last, everything else alphabetical.
    const rank = (c: string): number => (isFavoritesCollection(c) ? 0 : c === UNCATEGORIZED ? 2 : 1)
    return [...map.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([title, games]) => ({ key: `c:${title}`, title, games, favorite: isFavoritesCollection(title) }))
  }
  return [{ key: 'all', title: 'All games', games: sorted }]
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function formatPlaytime(minutes: number | undefined): string | undefined {
  if (minutes === undefined) return undefined
  if (minutes < 60) return `${minutes} min`
  const h = minutes / 60
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h).toLocaleString()} h`
}

export function formatDate(ms: number | undefined): string {
  if (!ms) return '—'
  const diff = Date.now() - ms
  const day = 86_400_000
  if (diff >= 0 && diff < day) return 'Today'
  if (diff >= 0 && diff < 2 * day) return 'Yesterday'
  if (diff >= 0 && diff < 7 * day) return `${Math.floor(diff / day)} days ago`
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
