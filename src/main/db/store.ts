import { promises as fs, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  DEFAULT_SETTINGS,
  type CustomGame,
  type GameOverride,
  type ScanReportEntry,
  type ScannedGame,
  type Settings
} from '@shared/types'

export interface CoverEntry {
  file?: string // cached local file
  source?: string // what it was resolved from
  failedAt?: number // last time every source failed
}

export interface StoreData {
  version: 1
  settings: Settings
  overrides: Record<string, GameOverride>
  customGames: CustomGame[]
  userCollections: string[]
  scanned: { games: ScannedGame[]; collections: string[]; report: ScanReportEntry[]; scannedAt: number }
  steamNames: Record<string, string | null>
  covers: Record<string, CoverEntry>
}

const EMPTY: StoreData = {
  version: 1,
  settings: DEFAULT_SETTINGS,
  overrides: {},
  customGames: [],
  userCollections: [],
  scanned: { games: [], collections: [], report: [], scannedAt: 0 },
  steamNames: {},
  covers: {}
}

/** A single JSON document on disk, written atomically and debounced. */
export class Store {
  data: StoreData
  private timer: NodeJS.Timeout | null = null
  private writing: Promise<void> = Promise.resolve()

  constructor(private readonly path: string) {
    this.data = Store.load(path)
  }

  private static load(path: string): StoreData {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<StoreData>
      return {
        ...EMPTY,
        ...raw,
        settings: { ...DEFAULT_SETTINGS, ...raw.settings },
        scanned: { ...EMPTY.scanned, ...raw.scanned }
      }
    } catch {
      return structuredClone(EMPTY)
    }
  }

  save(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), 300)
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const json = JSON.stringify(this.data)
    this.writing = this.writing.then(async () => {
      await fs.mkdir(dirname(this.path), { recursive: true })
      const tmp = this.path + '.tmp'
      await fs.writeFile(tmp, json)
      await fs.rename(tmp, this.path)
    })
    return this.writing
  }
}
