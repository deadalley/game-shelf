import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { extname, isAbsolute, join } from 'node:path'
import type { ScannedGame } from '@shared/types'
import type { CoverEntry } from '../db/store'
import { exists } from '../util/fs'

const SGDB = 'https://www.steamgriddb.com/api/v2'
const RETRY_FAILED_AFTER = 3 * 24 * 60 * 60 * 1000

export type Fetcher = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>

export interface CoverDeps {
  dir: string // cache directory
  fetch: Fetcher
  steamGridDbKey: () => string
}

function hash(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 16)
}

function extFromType(type: string | null, url: string): string {
  if (type?.includes('png')) return '.png'
  if (type?.includes('webp')) return '.webp'
  if (type?.includes('svg')) return '.svg'
  if (type?.includes('jpeg') || type?.includes('jpg')) return '.jpg'
  const e = extname(new URL(url).pathname).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(e) ? e : '.jpg'
}

/** Copies a local image or downloads a remote one into the cache; returns the cached path. */
export async function cacheImage(deps: CoverDeps, source: string): Promise<string | null> {
  await fs.mkdir(deps.dir, { recursive: true })
  if (isAbsolute(source) && !/^https?:/i.test(source)) {
    if (!(await exists(source))) return null
    const target = join(deps.dir, hash(source) + extname(source).toLowerCase())
    await fs.copyFile(source, target)
    return target
  }
  try {
    const res = await deps.fetch(source)
    if (!res.ok) return null
    const type = res.headers.get('content-type')
    if (type && !type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1024) return null // error placeholders
    const target = join(deps.dir, hash(source) + extFromType(type, source))
    await fs.writeFile(target, buf)
    return target
  } catch {
    return null
  }
}

async function sgdbGet<T>(deps: CoverDeps, path: string): Promise<T | null> {
  const key = deps.steamGridDbKey()
  if (!key) return null
  try {
    const res = await deps.fetch(SGDB + path, { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) return null
    const body = (await res.json()) as { success: boolean; data: T }
    return body.success ? body.data : null
  } catch {
    return null
  }
}

/** Portrait grid URLs from SteamGridDB for a game name (or Steam app id). */
export async function searchSteamGridDb(deps: CoverDeps, name: string, steamAppId?: string): Promise<string[]> {
  let gameId: number | undefined
  if (steamAppId) {
    gameId = (await sgdbGet<{ id: number }>(deps, `/games/steam/${steamAppId}`))?.id
  }
  if (!gameId) {
    const hits = await sgdbGet<{ id: number; name: string }[]>(deps, `/search/autocomplete/${encodeURIComponent(name)}`)
    gameId = hits?.[0]?.id
  }
  if (!gameId) return []
  const grids = await sgdbGet<{ url: string }[]>(
    deps,
    `/grids/game/${gameId}?dimensions=600x900,342x482,660x930&types=static`
  )
  return (grids ?? []).map((g) => g.url)
}

export function needsResolve(entry: CoverEntry | undefined, now = Date.now()): boolean {
  if (!entry) return true
  if (entry.file) return false
  return !entry.failedAt || now - entry.failedAt > RETRY_FAILED_AFTER
}

/**
 * Resolution order: launcher-provided image (local cache or CDN) → SteamGridDB → none.
 * User-chosen covers are handled separately through overrides.
 */
export async function resolveCover(deps: CoverDeps, game: ScannedGame): Promise<CoverEntry> {
  if (game.coverSource) {
    const file = await cacheImage(deps, game.coverSource)
    if (file) return { file, source: game.coverSource }
  }
  const urls = await searchSteamGridDb(deps, game.name, game.steamAppId)
  for (const url of urls.slice(0, 2)) {
    const file = await cacheImage(deps, url)
    if (file) return { file, source: url }
  }
  return { failedAt: Date.now() }
}
