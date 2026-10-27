import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStaticRegistry } from '../util/registry'
import type { ScanContext } from './types'

/**
 * Fixture mode (GAMESHELF_FIXTURES=<dir>) points every path at a fake filesystem,
 * so the whole app can be exercised on any OS.
 */
export function fixtureContext(dir: string, steamNames: Record<string, string | null>): ScanContext {
  const read = (f: string): string => {
    try {
      return readFileSync(join(dir, f), 'utf8')
    } catch {
      return ''
    }
  }
  const registry = JSON.parse(read('registry.json') || '{}')
  const appDetails = JSON.parse(read('steam-appdetails.json') || '{}')
  return {
    paths: {
      programData: join(dir, 'ProgramData'),
      programFiles: join(dir, 'Program Files'),
      programFilesX86: join(dir, 'Program Files (x86)'),
      localAppData: join(dir, 'LocalAppData'),
      appData: join(dir, 'AppData'),
      systemDrive: dir
    },
    reg: createStaticRegistry(registry),
    powershell: async () => read('xbox.json'),
    fetchJson: async (url) => {
      const id = /appids=(\d+)/.exec(url)?.[1]
      return id && appDetails[id] ? { [id]: appDetails[id] } : null
    },
    steamNames
  }
}
