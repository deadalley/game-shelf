import type { ScannedGame } from '@shared/types'
import { exists, statTime } from '../util/fs'
import { readUninstallEntries } from '../util/registry'
import type { ScanResult, Scanner } from './types'

/** Battle.net product uid prefixes → launcher codes accepted by battlenet://<code>. */
const PRODUCT_CODES: [RegExp, string][] = [
  [/^wow_classic_era/, 'WoWC'],
  [/^wow_classic/, 'WoWC'],
  [/^wow/, 'WoW'],
  [/^d3/, 'D3'],
  [/^fenris/, 'Fen'],
  [/^osi/, 'OSI'],
  [/^anbs/, 'ANBS'],
  [/^hs_beta/, 'WTCG'],
  [/^hero/, 'Hero'],
  [/^prometheus/, 'Pro'],
  [/^s1/, 'S1'],
  [/^s2/, 'S2'],
  [/^w3/, 'W3'],
  [/^rtro/, 'RTRO'],
  [/^wlby/, 'WLBY'],
  [/^viper/, 'VIPR'],
  [/^odin/, 'ODIN'],
  [/^lazarus/, 'LAZR'],
  [/^zeus/, 'ZEUS'],
  [/^fore/, 'FORE'],
  [/^auks/, 'AUKS'],
  [/^gryphon/, 'GRY']
]

export function productCode(uid: string): string | undefined {
  return PRODUCT_CODES.find(([re]) => re.test(uid.toLowerCase()))?.[1]
}

export const battlenetScanner: Scanner = {
  service: 'battlenet',
  async scan(ctx): Promise<ScanResult> {
    const entries = await readUninstallEntries(ctx.reg)
    const games: ScannedGame[] = []
    for (const values of entries.values()) {
      const publisher = values.Publisher ?? ''
      const uninstall = values.UninstallString ?? ''
      if (!/blizzard/i.test(publisher) || !/--uid=/.test(uninstall)) continue
      const uid = /--uid=([^\s"]+)/.exec(uninstall)?.[1]
      if (!uid || uid === 'battle.net' || !values.DisplayName) continue
      const dir = values.InstallLocation
      if (dir && !(await exists(dir))) continue
      const code = productCode(uid)
      games.push({
        id: `battlenet:${uid}`,
        service: 'battlenet',
        name: values.DisplayName,
        installed: true,
        installPath: dir,
        installedAt: dir ? await statTime(dir) : undefined,
        launch: { type: 'uri', target: code ? `battlenet://${code}` : 'battlenet://' }
      })
    }
    return { games, message: games.length ? undefined : 'No Battle.net games found' }
  }
}
