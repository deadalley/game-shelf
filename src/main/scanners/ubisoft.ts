import { basename } from 'node:path'
import type { ScannedGame } from '@shared/types'
import { exists, statTime } from '../util/fs'
import { readUninstallEntries } from '../util/registry'
import type { ScanResult, Scanner } from './types'

const INSTALLS_KEY = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs'

export const ubisoftScanner: Scanner = {
  service: 'ubisoft',
  async scan(ctx): Promise<ScanResult> {
    const tree = await ctx.reg.readTree(INSTALLS_KEY)
    if (tree.size === 0) return { games: [], message: 'Ubisoft Connect not found' }
    const uninstall = await readUninstallEntries(ctx.reg)

    const games: ScannedGame[] = []
    for (const [key, values] of tree) {
      const id = key.split('\\').pop()
      const dir = values.InstallDir?.replace(/[\\/]+$/, '')
      if (!id || !/^\d+$/.test(id) || !dir || !(await exists(dir))) continue
      const name = uninstall.get(`Uplay Install ${id}`)?.DisplayName || basename(dir)
      games.push({
        id: `ubisoft:${id}`,
        service: 'ubisoft',
        name,
        installed: true,
        installPath: dir,
        installedAt: await statTime(dir),
        launch: { type: 'uri', target: `uplay://launch/${id}/0` }
      })
    }
    return { games }
  }
}
