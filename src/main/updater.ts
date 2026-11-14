import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'

/**
 * Finds new versions on the GitHub releases page (the installer's latest.yml) and installs them.
 * Nothing downloads until the user asks; a downloaded update also installs on the next quit.
 */
export interface Updater {
  state(): UpdateState
  check(manual: boolean): Promise<void>
  download(): Promise<void>
  install(): void
}

type Send = (state: UpdateState, manual: boolean) => void

export function createUpdater(send: Send, opts: { enabled: boolean; fake?: string; quit(): void }): Updater {
  if (opts.fake) return fakeUpdater(send, opts.fake, opts.quit)
  if (!opts.enabled)
    return { state: () => ({ status: 'unsupported' }), check: async () => {}, download: async () => {}, install() {} }

  let state: UpdateState = { status: 'idle' }
  let manual = false
  const set = (next: UpdateState): void => {
    state = next
    send(state, manual)
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  autoUpdater.on('checking-for-update', () => set({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => set({ status: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => set({ status: 'none', checkedAt: Date.now() }))
  autoUpdater.on('download-progress', (p) => {
    if (state.status === 'available' || state.status === 'downloading') {
      set({ status: 'downloading', version: state.version, percent: Math.floor(p.percent) })
    }
  })
  autoUpdater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => set({ status: 'error', message: friendlyError(err) }))

  return {
    state: () => state,
    async check(isManual) {
      // Don't interrupt a download, or forget one that is waiting to install.
      if (state.status === 'checking' || state.status === 'downloading' || state.status === 'ready') return
      manual = isManual
      await autoUpdater.checkForUpdates().catch(() => {}) // reported through the 'error' event
    },
    async download() {
      if (state.status !== 'available') return
      manual = true
      set({ status: 'downloading', version: state.version, percent: 0 })
      await autoUpdater.downloadUpdate().catch(() => {})
    },
    install() {
      if (state.status === 'ready') autoUpdater.quitAndInstall(true, true)
    }
  }
}

function friendlyError(err: Error): string {
  const msg = String(err?.message ?? err)
  if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|ERR_INTERNET|net::/i.test(msg))
    return "Couldn't reach GitHub. Check your connection."
  if (/404|latest\.yml/i.test(msg)) return 'No update information was found on the releases page.'
  return 'Something went wrong while updating.'
}

/** GAMESHELF_FAKE_UPDATE=<version> (or "none") pretends a release exists, for mock runs and tests. */
function fakeUpdater(send: Send, version: string, quit: () => void): Updater {
  let state: UpdateState = { status: 'idle' }
  let manual = false
  const set = (next: UpdateState): void => {
    state = next
    send(state, manual)
  }
  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
  return {
    state: () => state,
    async check(isManual) {
      if (state.status === 'checking' || state.status === 'downloading' || state.status === 'ready') return
      manual = isManual
      set({ status: 'checking' })
      await wait(400)
      set(version === 'none' ? { status: 'none', checkedAt: Date.now() } : { status: 'available', version })
    },
    async download() {
      if (state.status !== 'available') return
      manual = true
      for (let percent = 0; percent < 100; percent += 25) {
        set({ status: 'downloading', version, percent })
        await wait(250)
      }
      set({ status: 'ready', version })
    },
    install() {
      if (state.status === 'ready') quit()
    }
  }
}
