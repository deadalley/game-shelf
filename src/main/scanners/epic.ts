import { join } from 'node:path'
import type { ScannedGame } from '@shared/types'
import { listDir, readText, statTime } from '../util/fs'
import type { ScanResult, Scanner } from './types'

interface EpicManifest {
  DisplayName?: string
  InstallLocation?: string
  CatalogNamespace?: string
  CatalogItemId?: string
  AppName?: string
  AppCategories?: string[]
  bIsIncompleteInstall?: boolean
  MainGameAppName?: string
}

interface CatalogItem {
  id: string
  namespace: string
  title: string
  keyImages?: { type: string; url: string }[]
  categories?: { path: string }[]
  mainGameItem?: unknown
  releaseInfo?: { appId: string }[]
}

const COVER_TYPES = ['DieselGameBoxTall', 'OfferImageTall', 'DieselGameBox']

export function parseCatalogCache(raw: string): CatalogItem[] {
  try {
    const json = Buffer.from(raw.trim(), 'base64').toString('utf8')
    const data = JSON.parse(json)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function isCatalogGame(item: CatalogItem): boolean {
  if (item.mainGameItem) return false // DLC / add-on
  const paths = (item.categories ?? []).map((c) => c.path)
  return (
    paths.includes('games') && !paths.some((p) => p === 'addons' || p === 'digitalextras' || p.startsWith('addons/'))
  )
}

export function catalogCover(item: CatalogItem): string | undefined {
  for (const type of COVER_TYPES) {
    const img = item.keyImages?.find((k) => k.type === type)
    if (img) return img.url
  }
  return undefined
}

function launchUri(ns: string, itemId: string, appName: string, action: 'launch' | 'install'): string {
  return `com.epicgames.launcher://apps/${ns}%3A${itemId}%3A${appName}?action=${action}&silent=true`
}

export const epicScanner: Scanner = {
  service: 'epic',
  async scan(ctx): Promise<ScanResult> {
    const data = join(ctx.paths.programData, 'Epic', 'EpicGamesLauncher', 'Data')
    const manifestsDir = join(data, 'Manifests')
    const files = (await listDir(manifestsDir)).filter((f) => f.toLowerCase().endsWith('.item'))
    const catalog = parseCatalogCache((await readText(join(data, 'Catalog', 'catcache.bin'))) ?? '')
    const byItemId = new Map(catalog.map((c) => [c.id, c]))

    if (files.length === 0 && catalog.length === 0) return { games: [], message: 'Epic Games Launcher not found' }

    const games: ScannedGame[] = []
    const seen = new Set<string>()
    for (const file of files) {
      const path = join(manifestsDir, file)
      let m: EpicManifest
      try {
        m = JSON.parse((await readText(path)) ?? '')
      } catch {
        continue
      }
      if (!m.DisplayName || !m.CatalogItemId || !m.CatalogNamespace || !m.AppName) continue
      if (m.AppCategories && !m.AppCategories.includes('games')) continue // engines, plugins
      if (m.MainGameAppName && m.MainGameAppName !== m.AppName) continue // DLC installed into a game
      seen.add(m.CatalogItemId)
      const cat = byItemId.get(m.CatalogItemId)
      games.push({
        id: `epic:${m.CatalogItemId}`,
        service: 'epic',
        name: m.DisplayName,
        installed: !m.bIsIncompleteInstall,
        installPath: m.InstallLocation,
        installedAt: await statTime(path),
        coverSource: cat ? catalogCover(cat) : undefined,
        launch: { type: 'uri', target: launchUri(m.CatalogNamespace, m.CatalogItemId, m.AppName, 'launch') }
      })
    }

    for (const item of catalog) {
      if (seen.has(item.id) || !isCatalogGame(item)) continue
      const appName = item.releaseInfo?.[0]?.appId
      if (!appName) continue
      seen.add(item.id)
      games.push({
        id: `epic:${item.id}`,
        service: 'epic',
        name: item.title,
        installed: false,
        coverSource: catalogCover(item),
        launch: { type: 'uri', target: launchUri(item.namespace, item.id, appName, 'launch') },
        install: { type: 'uri', target: launchUri(item.namespace, item.id, appName, 'install') }
      })
    }
    return { games }
  }
}
