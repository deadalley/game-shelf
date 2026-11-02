import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Game, type LibraryPayload, type Settings } from '@shared/types'

/** Where controller input currently goes, which decides the button hints shown. */
export type ControllerContext = 'shelf' | 'drawer' | 'menu' | 'dialog' | 'settings'

export interface ControllerState {
  connected: boolean
  name?: string
  context: ControllerContext
}

export type Toast = { id: number; text: string; kind: 'info' | 'error'; action?: { label: string; run(): void } }

interface LibraryState {
  ready: boolean
  scanning: boolean
  library: LibraryPayload
  settings: Settings
  search: string
  selectedId: string | null
  editingId: string | null
  addOpen: boolean
  settingsOpen: boolean
  collapsed: Record<string, boolean>
  toasts: Toast[]
  controller: ControllerState
  fullscreen: boolean

  init(): Promise<void>
  rescan(): Promise<void>
  setLibrary(lib: LibraryPayload): void
  updateSettings(patch: Partial<Settings>): void
  setSearch(q: string): void
  select(id: string | null): void
  edit(id: string | null): void
  setAddOpen(open: boolean): void
  setSettingsOpen(open: boolean): void
  toggleCollapsed(key: string): void
  launch(game: Game): Promise<void>
  install(game: Game): Promise<void>
  toggleHidden(game: Game): Promise<void>
  toast(text: string, kind?: Toast['kind'], action?: Toast['action']): void
  dismissToast(id: number): void
  setController(patch: Partial<ControllerState>): void
  toggleFullscreen(): Promise<void>
}

const api = window.gameshelf
let toastId = 0
let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useLibrary = create<LibraryState>((set, get) => ({
  ready: false,
  scanning: false,
  library: { games: [], collections: [], report: [], scannedAt: 0 },
  settings: DEFAULT_SETTINGS,
  search: '',
  selectedId: null,
  editingId: null,
  addOpen: false,
  settingsOpen: false,
  collapsed: {},
  toasts: [],
  controller: { connected: false, context: 'shelf' },
  fullscreen: false,

  async init() {
    const [library, settings] = await Promise.all([api.getLibrary(), api.getSettings()])
    // The main process rescans at startup; treat that as in-progress until the first update arrives.
    set({ library, settings, ready: true, scanning: true })
    api.onLibraryChanged((lib) => set({ library: lib, scanning: false }))
    api.onFullscreenChanged((fullscreen) => set({ fullscreen }))
    set({ fullscreen: await api.isFullscreen() })
  },

  async rescan() {
    set({ scanning: true })
    try {
      set({ library: await api.rescan() })
    } finally {
      set({ scanning: false })
    }
  },

  setLibrary: (library) => set({ library }),

  updateSettings(patch) {
    set({ settings: { ...get().settings, ...patch } })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void api.setSettings(get().settings), 250)
  },

  setSearch: (search) => set({ search }),
  select: (selectedId) => set({ selectedId }),
  edit: (editingId) => set({ editingId }),
  setAddOpen: (addOpen) => set({ addOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleCollapsed: (key) => set({ collapsed: { ...get().collapsed, [key]: !get().collapsed[key] } }),

  async launch(game) {
    if (!game.installed && game.install) return get().install(game)
    get().toast(`Launching ${game.name}…`)
    const res = await api.launch(game.id)
    if (!res.ok) get().toast(res.error ?? 'Could not launch game', 'error')
  },

  async install(game) {
    get().toast(`Opening ${game.name} in its launcher…`)
    const res = await api.install(game.id)
    if (!res.ok) get().toast(res.error ?? 'Could not start install', 'error')
  },

  async toggleHidden(game) {
    const hidden = !game.hidden
    set({ library: await api.updateGame(game.id, { hidden }) })
    if (hidden) {
      get().toast(`${game.name} hidden`, 'info', {
        label: 'Undo',
        run: () => void get().toggleHidden({ ...game, hidden })
      })
    } else {
      get().toast(`${game.name} is back on your shelf`)
    }
  },

  toast(text, kind = 'info', action) {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, text, kind, action }] })
    setTimeout(() => get().dismissToast(id), action ? 6000 : 3500)
  },

  async toggleFullscreen() {
    await api.toggleFullscreen()
  },

  setController(patch) {
    const cur = get().controller
    if (Object.entries(patch).every(([k, v]) => cur[k as keyof ControllerState] === v)) return
    set({ controller: { ...cur, ...patch } })
  },

  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  }
}))

export function useGame(id: string | null): Game | undefined {
  return useLibrary((s) => (id ? s.library.games.find((g) => g.id === id) : undefined))
}
