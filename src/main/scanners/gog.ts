import { join } from 'node:path'
import type { LaunchSpec, ScannedGame } from '@shared/types'
import { exists } from '../util/fs'
import { openDatabase, queryAll } from '../util/sqlite'
import type { RegValues } from '../util/registry'
import type { ScanContext, ScanResult, Scanner } from './types'

const GOG_GAMES_KEY = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games'
const GALAXY_KEY = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths'

interface GalaxyGame {
  releaseKey: string
  title?: string
  cover?: string
  minutes?: number
  lastPlayed?: number
  installedAt?: number
  installed: boolean
  tags: string[]
}

function parseDate(v: unknown): number | undefined {
  if (typeof v !== 'string' || !v) return undefined
  const t = Date.parse(v.includes('T') ? v : v.replace(' ', 'T') + 'Z')
  return Number.isFinite(t) ? t : undefined
}

function parseJson<T>(v: unknown): T | undefined {
  try {
    return typeof v === 'string' ? (JSON.parse(v) as T) : undefined
  } catch {
    return undefined
  }
}

/** Reads owned GOG games from GOG Galaxy 2.0's database. Only native GOG releases (gog_*) are used. */
export async function readGalaxyDb(dbPath: string): Promise<GalaxyGame[] | null> {
  const db = await openDatabase(dbPath)
  if (!db) return null
  try {
    const games = new Map<string, GalaxyGame>()
    const get = (key: string): GalaxyGame => {
      let g = games.get(key)
      if (!g) games.set(key, (g = { releaseKey: key, installed: false, tags: [] }))
      return g
    }

    for (const r of queryAll<{ releaseKey: string }>(
      db,
      `SELECT DISTINCT releaseKey FROM LibraryReleases WHERE releaseKey LIKE 'gog\\_%' ESCAPE '\\'`
    )) {
      get(r.releaseKey)
    }
    for (const r of queryAll<{ productId: number; installationDate: string }>(
      db,
      'SELECT productId, installationDate FROM InstalledBaseProducts'
    )) {
      const g = get(`gog_${r.productId}`)
      g.installed = true
      g.installedAt = parseDate(r.installationDate)
    }

    const pieces = queryAll<{ releaseKey: string; type: string; value: string }>(
      db,
      `SELECT gp.releaseKey, gpt.type, gp.value FROM GamePieces gp
       JOIN GamePieceTypes gpt ON gp.gamePieceTypeId = gpt.id
       WHERE gpt.type IN ('title', 'originalTitle', 'originalImages') AND gp.releaseKey LIKE 'gog\\_%' ESCAPE '\\'`
    )
    for (const p of pieces) {
      const g = games.get(p.releaseKey)
      if (!g) continue
      if (p.type === 'title' || (p.type === 'originalTitle' && !g.title)) {
        g.title = parseJson<{ title?: string }>(p.value)?.title ?? g.title
      } else if (p.type === 'originalImages') {
        g.cover = parseJson<{ verticalCover?: string }>(p.value)?.verticalCover ?? g.cover
      }
    }
    for (const r of queryAll<{ releaseKey: string; minutesInGame: number }>(
      db,
      'SELECT releaseKey, minutesInGame FROM GameTimes'
    )) {
      const g = games.get(r.releaseKey)
      if (g && r.minutesInGame > 0) g.minutes = Math.max(g.minutes ?? 0, r.minutesInGame)
    }
    for (const r of queryAll<{ gameReleaseKey: string; lastPlayedDate: string }>(
      db,
      'SELECT gameReleaseKey, lastPlayedDate FROM LastPlayedDates'
    )) {
      const g = games.get(r.gameReleaseKey)
      const t = parseDate(r.lastPlayedDate)
      if (g && t) g.lastPlayed = Math.max(g.lastPlayed ?? 0, t)
    }
    for (const r of queryAll<{ releaseKey: string; tag: string }>(db, 'SELECT releaseKey, tag FROM UserReleaseTags')) {
      games.get(r.releaseKey)?.tags.push(r.tag)
    }
    return [...games.values()]
  } finally {
    db.close()
  }
}

function exeLaunch(values: RegValues): LaunchSpec | undefined {
  if (!values.exe) return undefined
  return { type: 'exe', target: values.exe, args: values.launchParam || undefined }
}

async function galaxyClient(ctx: ScanContext): Promise<string | undefined> {
  const paths = await ctx.reg.read(GALAXY_KEY)
  const exe = paths?.client ? join(paths.client, 'GalaxyClient.exe') : undefined
  return exe && (await exists(exe)) ? exe : undefined
}

export const gogScanner: Scanner = {
  service: 'gog',
  async scan(ctx): Promise<ScanResult> {
    const dbPath = join(ctx.paths.programData, 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db')
    const galaxy = (await exists(dbPath)) ? await readGalaxyDb(dbPath) : null
    const client = await galaxyClient(ctx)

    // Registry entries exist for every installed GOG game, with or without Galaxy.
    const regTree = await ctx.reg.readTree(GOG_GAMES_KEY)
    const regById = new Map<string, RegValues>()
    for (const [key, values] of regTree) {
      const id = key.split('\\').pop()
      if (id && /^\d+$/.test(id) && values.gameName) regById.set(id, values)
    }

    if (!galaxy && regById.size === 0) return { games: [], message: 'GOG not found' }

    const games: ScannedGame[] = []
    const seen = new Set<string>()
    for (const g of galaxy ?? []) {
      const id = g.releaseKey.slice(4)
      const reg = regById.get(id)
      const name = g.title ?? reg?.gameName
      if (!name) continue
      seen.add(id)
      games.push({
        id: `gog:${id}`,
        service: 'gog',
        name,
        installed: g.installed || !!reg,
        installPath: reg?.path,
        coverSource: g.cover,
        playtimeMinutes: g.minutes,
        lastPlayed: g.lastPlayed,
        installedAt: g.installedAt,
        collections: g.tags.length ? g.tags : undefined,
        launch: client && reg?.path ? galaxyLaunch(client, id, reg.path) : reg ? exeLaunch(reg) : undefined,
        install: { type: 'uri', target: `goggalaxy://openGameView/${g.releaseKey}` }
      })
    }
    for (const [id, reg] of regById) {
      if (seen.has(id)) continue
      games.push({
        id: `gog:${id}`,
        service: 'gog',
        name: reg.gameName,
        installed: true,
        installPath: reg.path,
        launch: exeLaunch(reg)
      })
    }
    const tags = [...new Set((galaxy ?? []).flatMap((g) => g.tags))]
    return { games, collections: tags }
  }
}

/** Launching through Galaxy keeps its playtime tracking and cloud saves working. */
function galaxyLaunch(client: string, id: string, path: string): LaunchSpec {
  return { type: 'exe', target: client, args: `/command=runGame /gameId=${id} /path="${path}"` }
}
