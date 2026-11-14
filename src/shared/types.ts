export type Service = 'steam' | 'xbox' | 'gog' | 'epic' | 'ea' | 'ubisoft' | 'battlenet' | 'custom'

export const SERVICES: Service[] = ['steam', 'xbox', 'gog', 'epic', 'ea', 'ubisoft', 'battlenet', 'custom']

export const SERVICE_LABELS: Record<Service, string> = {
  steam: 'Steam',
  xbox: 'Xbox',
  gog: 'GOG',
  epic: 'Epic Games',
  ea: 'EA',
  ubisoft: 'Ubisoft',
  battlenet: 'Battle.net',
  custom: 'Other'
}

export interface LaunchSpec {
  type: 'uri' | 'exe'
  target: string
  args?: string
}

/** A game as reported by a launcher scanner, before user overrides are applied. */
export interface ScannedGame {
  id: string // `${service}:${nativeId}`
  service: Service
  name: string
  installed: boolean
  installPath?: string
  launch?: LaunchSpec
  install?: LaunchSpec // how to trigger an install for uninstalled games
  /** Remote URL or absolute local path of a portrait cover found by the scanner. */
  coverSource?: string
  steamAppId?: string
  playtimeMinutes?: number
  lastPlayed?: number // epoch ms
  installedAt?: number // epoch ms
  collections?: string[]
}

/** User edits that survive rescans. Any field set here wins over scanned data. */
export interface GameOverride {
  name?: string
  cover?: string // absolute local path chosen by the user
  launch?: LaunchSpec
  collections?: string[]
  hidden?: boolean
  trackedMinutes?: number // playtime GameShelf measured itself
  lastPlayed?: number
}

export interface CustomGame {
  id: string // `custom:<uuid>`
  name: string
  exePath: string
  args?: string
  cover: string
  addedAt: number
}

/** The merged game the UI works with. */
export interface Game {
  id: string
  service: Service
  name: string
  installed: boolean
  installPath?: string
  launch?: LaunchSpec
  install?: LaunchSpec
  coverUrl?: string // cover:// URL served by the main process
  playtimeMinutes?: number
  lastPlayed?: number
  installedAt?: number
  collections: string[]
  hidden: boolean
}

export type ThemeId = 'clean' | 'old' | 'modern' | 'pixel'
export type WrapperId = 'none' | 'ps' | 'xbox'
export type SortId = 'name' | 'lastPlayed' | 'playtime'
export type GroupId = 'none' | 'service' | 'collection'
export type LayoutId = 'flat' | 'stacked'
export type InstallFilter = 'all' | 'installed' | 'uninstalled'
export type ColorMode = 'system' | 'light' | 'dark'

/** Services the user can switch off. Custom games are always shown. */
export const LAUNCHERS: Service[] = SERVICES.filter((s) => s !== 'custom')

export interface Settings {
  steamGridDbKey: string
  theme: ThemeId
  wrapper: WrapperId
  sort: SortId
  group: GroupId
  installFilter: InstallFilter
  services: Service[] // empty = all
  showTitles: boolean
  showPlaytime: boolean
  showHidden: boolean
  coverSize: number // px width of a cover
  disabledServices: Service[] // launchers that are neither scanned nor shown
  layout: LayoutId // covers facing out, or spines side by side
  controller: boolean // navigate with a gamepad
  controllerHints: boolean // show the button hints bar while a controller is connected
  startFullscreen: boolean
  shelfOnly: boolean // hide all menus and buttons; only the shelves remain
  backgroundTransparency: number // 0–100: how much of the (blurred) desktop shows behind the shelves
  colorMode: ColorMode
  animations: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  steamGridDbKey: '',
  theme: 'modern',
  wrapper: 'none',
  sort: 'name',
  group: 'none',
  installFilter: 'all',
  services: [],
  showTitles: true,
  showPlaytime: true,
  showHidden: false,
  coverSize: 150,
  disabledServices: [],
  layout: 'flat',
  controller: true,
  controllerHints: true,
  startFullscreen: false,
  shelfOnly: false,
  backgroundTransparency: 0,
  colorMode: 'system',
  animations: true
}

export interface ScanReportEntry {
  service: Service
  ok: boolean
  found: number
  message?: string
  durationMs: number
}

export interface LibraryPayload {
  games: Game[]
  collections: string[]
  report: ScanReportEntry[]
  scannedAt: number
}

export interface GameShelfApi {
  getLibrary(): Promise<LibraryPayload>
  rescan(): Promise<LibraryPayload>
  launch(id: string): Promise<{ ok: boolean; error?: string }>
  install(id: string): Promise<{ ok: boolean; error?: string }>
  updateGame(id: string, patch: GameOverride): Promise<LibraryPayload>
  resetGame(id: string): Promise<LibraryPayload>
  addCustomGame(game: Omit<CustomGame, 'id' | 'addedAt'>): Promise<LibraryPayload>
  removeCustomGame(id: string): Promise<LibraryPayload>
  pickFile(kind: 'exe' | 'image'): Promise<string | null>
  searchCovers(name: string): Promise<{ ok: boolean; covers: string[]; error?: string }>
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>
  refreshCovers(): Promise<void>
  openDataFolder(): Promise<void>
  getAppInfo(): Promise<{ version: string; dataPath: string; mock: boolean; acrylic: boolean }>
  onLibraryChanged(cb: (lib: LibraryPayload) => void): () => void
  toggleFullscreen(): Promise<boolean>
  isFullscreen(): Promise<boolean>
  onFullscreenChanged(cb: (fullscreen: boolean) => void): () => void
}
