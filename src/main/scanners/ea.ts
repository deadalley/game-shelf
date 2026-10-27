import { join } from 'node:path'
import type { ScannedGame } from '@shared/types'
import { exists, readText, statTime } from '../util/fs'
import { readUninstallEntries } from '../util/registry'
import type { ScanResult, Scanner } from './types'

const EA_PUBLISHER = /electronic arts|^ea\b|ea swiss/i
const NOT_GAMES = /^(ea app|origin|ea desktop)$/i

/** Pulls the first content id out of an EA `__Installer/installerdata.xml`. */
export function parseContentId(xml: string): string | undefined {
  return /<contentID>\s*([^<\s]+)\s*<\/contentID>/i.exec(xml)?.[1]
}

/** DisplayIcon is usually `"C:\path\game.exe",0`; that's the most reliable exe we can get. */
export function exeFromDisplayIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined
  const path = icon
    .replace(/,\s*-?\d+$/, '')
    .replace(/^"|"$/g, '')
    .trim()
  return /\.exe$/i.test(path) ? path : undefined
}

export const eaScanner: Scanner = {
  service: 'ea',
  async scan(ctx): Promise<ScanResult> {
    const entries = await readUninstallEntries(ctx.reg)
    const games: ScannedGame[] = []
    for (const [key, values] of entries) {
      if (!EA_PUBLISHER.test(values.Publisher ?? '') || !values.DisplayName || NOT_GAMES.test(values.DisplayName))
        continue
      const dir = values.InstallLocation?.replace(/^"|"$/g, '')
      if (!dir || !(await exists(dir))) continue
      const installer = await readText(join(dir, '__Installer', 'installerdata.xml'))
      if (!installer) continue // only titles managed by the EA app / Origin
      const contentId = parseContentId(installer) ?? key
      const exe = exeFromDisplayIcon(values.DisplayIcon)
      games.push({
        id: `ea:${contentId}`,
        service: 'ea',
        name: values.DisplayName,
        installed: true,
        installPath: dir,
        installedAt: await statTime(dir),
        launch: exe
          ? { type: 'exe', target: exe }
          : { type: 'uri', target: `origin2://game/launch?offerIds=${encodeURIComponent(contentId)}` }
      })
    }
    return { games, message: games.length ? undefined : 'No EA games found' }
  }
}
