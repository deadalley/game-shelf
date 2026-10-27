import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BrowserWindow, Menu, app, dialog, ipcMain, nativeTheme, net, protocol, shell } from 'electron'
import type { CustomGame, Game, GameOverride, LibraryPayload, Settings } from '@shared/types'
import { Store } from './db/store'
import { cacheImage, needsResolve, resolveCover, searchSteamGridDb, type CoverDeps } from './covers/resolver'
import { launch } from './launcher'
import { COVER_SCHEME, allCollections, buildGames, coverFile } from './library'
import { createScanContext } from './scanners/context'
import { scanAll } from './scanners'
import { mapLimit } from './util/fs'

if (process.env.GAMESHELF_USER_DATA) app.setPath('userData', process.env.GAMESHELF_USER_DATA)

protocol.registerSchemesAsPrivileged([
  { scheme: COVER_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

let win: BrowserWindow | null = null
let store: Store
let coverDeps: CoverDeps
let scanning: Promise<LibraryPayload> | null = null

function payload(): LibraryPayload {
  const games = buildGames(store.data)
  return {
    games,
    collections: allCollections(store.data, games),
    report: store.data.scanned.report,
    scannedAt: store.data.scanned.scannedAt
  }
}

let broadcastTimer: NodeJS.Timeout | null = null
function broadcast(): void {
  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    win?.webContents.send('library:changed', payload())
  }, 400)
}

function findGame(id: string): Game | undefined {
  return buildGames(store.data).find((g) => g.id === id)
}

async function resolveMissingCovers(): Promise<void> {
  const pending = store.data.scanned.games.filter(
    (g) => !store.data.overrides[g.id]?.cover && needsResolve(store.data.covers[g.id])
  )
  await mapLimit(pending, 4, async (g) => {
    store.data.covers[g.id] = await resolveCover(coverDeps, g)
    store.save()
    broadcast()
  })
}

async function rescan(): Promise<LibraryPayload> {
  if (scanning) return scanning
  scanning = (async () => {
    const ctx = createScanContext(store.data.steamNames)
    if (!ctx) {
      store.data.scanned.report = [
        { service: 'steam', ok: false, found: 0, message: 'Launcher scanning only works on Windows', durationMs: 0 }
      ]
    } else {
      const result = await scanAll(ctx)
      store.data.scanned = { ...result, scannedAt: Date.now() }
    }
    store.save()
    void resolveMissingCovers()
    return payload()
  })().finally(() => {
    scanning = null
  })
  return scanning
}

/** Accepts a local path or https URL and returns a cached copy. */
async function importCover(source: string): Promise<string> {
  const file = await cacheImage(coverDeps, source)
  if (!file) throw new Error('Could not load that image')
  return file
}

function registerIpc(): void {
  ipcMain.handle('library:get', () => payload())
  ipcMain.handle('library:rescan', () => rescan())

  ipcMain.handle('game:launch', async (_e, id: string) => {
    const game = findGame(id)
    if (!game?.launch) return { ok: false, error: 'This game has no launch command. Edit it to set one.' }
    try {
      await launch(game.launch, {
        onSessionEnd: (minutes) => {
          const o = (store.data.overrides[id] ??= {})
          o.trackedMinutes = (o.trackedMinutes ?? 0) + minutes
          store.save()
          broadcast()
        }
      })
      ;(store.data.overrides[id] ??= {}).lastPlayed = Date.now()
      store.save()
      broadcast()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('game:install', async (_e, id: string) => {
    const game = findGame(id)
    if (!game?.install) return { ok: false, error: 'Install this game from its launcher.' }
    try {
      await launch(game.install)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('game:update', async (_e, id: string, patch: GameOverride) => {
    const next: GameOverride = { ...store.data.overrides[id] }
    if (patch.name !== undefined) next.name = patch.name.trim() || undefined
    if (patch.cover !== undefined) next.cover = patch.cover ? await importCover(patch.cover) : undefined
    if (patch.launch !== undefined) next.launch = patch.launch?.target ? patch.launch : undefined
    if (patch.collections !== undefined) {
      next.collections = patch.collections
      for (const c of patch.collections) {
        if (!store.data.userCollections.includes(c)) store.data.userCollections.push(c)
      }
    }
    if (patch.hidden !== undefined) next.hidden = patch.hidden
    store.data.overrides[id] = next
    const custom = store.data.customGames.find((c) => c.id === id)
    if (custom) {
      if (next.name) custom.name = next.name
      if (next.launch?.type === 'exe') {
        custom.exePath = next.launch.target
        custom.args = next.launch.args
      }
    }
    store.save()
    return payload()
  })

  ipcMain.handle('game:reset', (_e, id: string) => {
    const { trackedMinutes, lastPlayed } = store.data.overrides[id] ?? {}
    store.data.overrides[id] = { trackedMinutes, lastPlayed }
    store.save()
    return payload()
  })

  ipcMain.handle('custom:add', async (_e, input: Omit<CustomGame, 'id' | 'addedAt'>) => {
    if (!input.name?.trim() || !input.exePath || !input.cover)
      throw new Error('Name, executable and cover are required')
    const id = `custom:${randomUUID()}`
    const cover = await importCover(input.cover)
    store.data.customGames.push({ ...input, id, name: input.name.trim(), cover, addedAt: Date.now() })
    store.data.overrides[id] = { cover }
    store.save()
    return payload()
  })

  ipcMain.handle('custom:remove', (_e, id: string) => {
    store.data.customGames = store.data.customGames.filter((c) => c.id !== id)
    delete store.data.overrides[id]
    store.save()
    return payload()
  })

  ipcMain.handle('dialog:pick', async (_e, kind: 'exe' | 'image') => {
    if (!win) return null
    const res = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters:
        kind === 'exe'
          ? [
              { name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk', 'url'] },
              { name: 'All files', extensions: ['*'] }
            ]
          : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }]
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('covers:search', async (_e, name: string) => {
    if (!store.data.settings.steamGridDbKey) {
      return { ok: false, covers: [], error: 'Add a SteamGridDB API key in Settings to search for covers.' }
    }
    const covers = await searchSteamGridDb(coverDeps, name)
    return { ok: true, covers, error: covers.length ? undefined : 'No covers found for that name.' }
  })

  ipcMain.handle('settings:get', () => store.data.settings)
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const keyChanged = patch.steamGridDbKey !== undefined && patch.steamGridDbKey !== store.data.settings.steamGridDbKey
    store.data.settings = { ...store.data.settings, ...patch }
    if (keyChanged) {
      // A new key may find covers that failed before.
      for (const entry of Object.values(store.data.covers)) delete entry.failedAt
      void resolveMissingCovers()
    }
    store.save()
    return store.data.settings
  })
}

function createWindow(): void {
  const dark = nativeTheme.shouldUseDarkColors
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'GameShelf',
    backgroundColor: dark ? '#17171a' : '#f4f3f1',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: dark ? '#d8d6d2' : '#3b3a37', height: 52 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  nativeTheme.on('updated', () => {
    win?.setTitleBarOverlay?.({ symbolColor: nativeTheme.shouldUseDarkColors ? '#d8d6d2' : '#3b3a37' })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  win.on('closed', () => (win = null))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win?.isMinimized()) win.restore()
    win?.focus()
  })

  void app.whenReady().then(() => {
    app.setAppUserModelId('com.deadalley.gameshelf')
    Menu.setApplicationMenu(null)
    store = new Store(join(app.getPath('userData'), 'library.json'))
    coverDeps = {
      dir: join(app.getPath('userData'), 'covers'),
      fetch: (url, init) => net.fetch(url, init),
      steamGridDbKey: () => store.data.settings.steamGridDbKey
    }

    protocol.handle(COVER_SCHEME, (req) => {
      const url = new URL(req.url)
      // gamecover://file/?p=<path> previews an image the user just picked, before it is saved.
      const file =
        url.hostname === 'file'
          ? (url.searchParams.get('p') ?? undefined)
          : coverFile(store.data, decodeURIComponent(url.pathname.slice(1)))
      if (file && url.hostname === 'file' && !/\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(file)) {
        return new Response('Forbidden', { status: 403 })
      }
      if (!file) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(file).toString())
    })

    registerIpc()
    createWindow()
    // Show the cached library instantly, then refresh from the launchers.
    void rescan().then(() => broadcast())
  })

  app.on('window-all-closed', () => {
    void store?.flush().finally(() => app.quit())
  })
}
