import { join } from 'node:path'
import type { ScannedGame } from '@shared/types'
import { parseVdf, vobj, vstr } from '../util/vdf'
import { exists, findFile, listDir, mapLimit, readText } from '../util/fs'
import type { ScanContext, ScanResult, Scanner } from './types'

/** Runtimes, redistributables and tools that show up as apps but aren't games. */
const NON_GAME_IDS = new Set(['228980', '1070560', '1391110', '1628350', '1493710', '250820', '1826330'])
const NON_GAME_NAME = /^(proton|steam linux runtime|steamworks common|steamvr|steam audio)/i

const STEAM_ID64_BASE = 76561197960265728n
const MAX_NAME_LOOKUPS = 80

export async function findSteamPath(ctx: ScanContext): Promise<string | null> {
  const reg =
    (await ctx.reg.read('HKEY_CURRENT_USER\\Software\\Valve\\Steam')) ??
    (await ctx.reg.read('HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam'))
  const candidates = [reg?.SteamPath, reg?.InstallPath, join(ctx.paths.programFilesX86, 'Steam')]
  for (const c of candidates) {
    if (c && (await exists(join(c, 'steamapps')))) return c
  }
  return null
}

export function parseLibraryFolders(text: string): string[] {
  const root = vobj(parseVdf(text), 'libraryfolders') ?? {}
  const out: string[] = []
  for (const value of Object.values(root)) {
    if (typeof value === 'string') {
      // Very old format: "1" "D:\\SteamLibrary"
      if (/[\\/]/.test(value)) out.push(value)
    } else {
      const p = vstr(value, 'path')
      if (p) out.push(p)
    }
  }
  return out
}

export interface AppManifest {
  appid: string
  name: string
  installdir: string
  lastUpdated?: number
  fullyInstalled: boolean
}

export function parseAppManifest(text: string): AppManifest | null {
  const state = vobj(parseVdf(text), 'AppState')
  const appid = vstr(state, 'appid')
  const name = vstr(state, 'name')
  if (!appid || !name) return null
  const updated = Number(vstr(state, 'LastUpdated'))
  const flags = Number(vstr(state, 'StateFlags') ?? '4')
  return {
    appid,
    name,
    installdir: vstr(state, 'installdir') ?? '',
    lastUpdated: updated > 0 ? updated * 1000 : undefined,
    // StateFlags bit 4 = fully installed
    fullyInstalled: (flags & 4) === 4
  }
}

export interface AppActivity {
  playtimeMinutes?: number
  lastPlayed?: number
}

export function parseLocalConfig(text: string): Map<string, AppActivity> {
  const apps = vobj(parseVdf(text), 'UserLocalConfigStore', 'Software', 'Valve', 'Steam', 'apps') ?? {}
  const out = new Map<string, AppActivity>()
  for (const [appid, node] of Object.entries(apps)) {
    if (typeof node === 'string' || !/^\d+$/.test(appid)) continue
    const playtime = Number(vstr(node, 'Playtime'))
    const last = Number(vstr(node, 'LastPlayed'))
    if (!(playtime > 0) && !(last > 0)) continue
    out.set(appid, {
      playtimeMinutes: playtime > 0 ? playtime : undefined,
      lastPlayed: last > 0 ? last * 1000 : undefined
    })
  }
  return out
}

export interface SteamCollection {
  id: string
  name: string
  appIds: string[]
}

/** Parses cloud-storage-namespace-1.json, where Steam keeps user collections. */
export function parseCollections(text: string): SteamCollection[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const out: SteamCollection[] = []
  for (const entry of data) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !entry[0].startsWith('user-collections.')) continue
    const meta = entry[1] as { is_deleted?: boolean; value?: string }
    if (!meta || meta.is_deleted || !meta.value) continue
    try {
      const value = JSON.parse(meta.value) as { id: string; name?: string; added?: number[] }
      if (!Array.isArray(value.added) || value.id === 'hidden') continue // dynamic collections have no `added`
      const name = value.id === 'favorite' ? 'Favorites' : value.name
      if (!name) continue
      out.push({ id: value.id, name, appIds: value.added.map(String) })
    } catch {
      // ignore malformed entry
    }
  }
  return out
}

async function findUserDirs(steamPath: string): Promise<string[]> {
  const userdata = join(steamPath, 'userdata')
  const loginUsers = await readText(join(steamPath, 'config', 'loginusers.vdf'))
  const ids = (await listDir(userdata)).filter((d) => /^\d+$/.test(d) && d !== '0')
  if (loginUsers) {
    const users = vobj(parseVdf(loginUsers), 'users') ?? {}
    for (const [id64, node] of Object.entries(users)) {
      if (vstr(node, 'MostRecent') === '1') {
        try {
          const accountId = (BigInt(id64) - STEAM_ID64_BASE).toString()
          if (ids.includes(accountId)) return [join(userdata, accountId)]
        } catch {
          // fall through
        }
      }
    }
  }
  return ids.map((id) => join(userdata, id))
}

async function resolveNames(ctx: ScanContext, appIds: string[]): Promise<void> {
  const missing = appIds.filter((id) => !(id in ctx.steamNames)).slice(0, MAX_NAME_LOOKUPS)
  await mapLimit(missing, 4, async (id) => {
    const res = (await ctx.fetchJson(
      `https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic`
    )) as Record<string, { success: boolean; data?: { name: string; type: string } }> | null
    if (!res) return // network failure: try again next scan
    const entry = res[id]
    ctx.steamNames[id] = entry?.success && entry.data?.type === 'game' ? entry.data.name : null
  })
}

function cdnCover(appid: string): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900_2x.jpg`
}

async function localCover(steamPath: string, appid: string): Promise<string | undefined> {
  const cache = join(steamPath, 'appcache', 'librarycache')
  // Newer clients: librarycache/<appid>/.../library_600x900.jpg; older: librarycache/<appid>_library_600x900.jpg
  return (
    (await findFile(join(cache, appid), /^library_600x900(_2x)?\./, 2)) ??
    (await findFile(cache, new RegExp(`^${appid}_library_600x900(_2x)?\\.`), 0))
  )
}

export const steamScanner: Scanner = {
  service: 'steam',
  async scan(ctx): Promise<ScanResult> {
    const steamPath = await findSteamPath(ctx)
    if (!steamPath) return { games: [], message: 'Steam not found' }

    const libText = await readText(join(steamPath, 'steamapps', 'libraryfolders.vdf'))
    const libraries = new Set([steamPath, ...(libText ? parseLibraryFolders(libText) : [])])

    const installed = new Map<string, { manifest: AppManifest; library: string }>()
    for (const lib of libraries) {
      const steamapps = join(lib, 'steamapps')
      for (const file of await listDir(steamapps)) {
        if (!/^appmanifest_\d+\.acf$/i.test(file)) continue
        const text = await readText(join(steamapps, file))
        const manifest = text ? parseAppManifest(text) : null
        if (manifest && !installed.has(manifest.appid)) installed.set(manifest.appid, { manifest, library: lib })
      }
    }

    const activity = new Map<string, AppActivity>()
    const collections: SteamCollection[] = []
    for (const userDir of await findUserDirs(steamPath)) {
      const local = await readText(join(userDir, 'config', 'localconfig.vdf'))
      if (local) for (const [id, a] of parseLocalConfig(local)) if (!activity.has(id)) activity.set(id, a)
      const cloud = await readText(join(userDir, 'config', 'cloudstorage', 'cloud-storage-namespace-1.json'))
      if (cloud) collections.push(...parseCollections(cloud))
    }

    const collectionsByApp = new Map<string, string[]>()
    for (const c of collections) {
      for (const id of c.appIds) collectionsByApp.set(id, [...(collectionsByApp.get(id) ?? []), c.name])
    }

    // Owned-but-not-installed: anything with activity or in a collection.
    const uninstalledIds = [...new Set([...activity.keys(), ...collectionsByApp.keys()])].filter(
      (id) => !installed.has(id) && !NON_GAME_IDS.has(id)
    )
    await resolveNames(ctx, uninstalledIds)

    const games: ScannedGame[] = []
    const make = async (appid: string, name: string, extra: Partial<ScannedGame>): Promise<ScannedGame> => ({
      id: `steam:${appid}`,
      service: 'steam',
      name,
      installed: false,
      steamAppId: appid,
      coverSource: (await localCover(steamPath, appid)) ?? cdnCover(appid),
      launch: { type: 'uri', target: `steam://rungameid/${appid}` },
      install: { type: 'uri', target: `steam://install/${appid}` },
      collections: collectionsByApp.get(appid),
      ...activity.get(appid),
      ...extra
    })

    for (const [appid, { manifest, library }] of installed) {
      if (NON_GAME_IDS.has(appid) || NON_GAME_NAME.test(manifest.name)) continue
      games.push(
        await make(appid, manifest.name, {
          installed: manifest.fullyInstalled,
          installPath: join(library, 'steamapps', 'common', manifest.installdir),
          installedAt: manifest.lastUpdated
        })
      )
    }
    for (const appid of uninstalledIds) {
      const name = ctx.steamNames[appid]
      if (name) games.push(await make(appid, name, {}))
    }

    return { games, collections: [...new Set(collections.map((c) => c.name))] }
  }
}
