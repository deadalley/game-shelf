import { contextBridge, ipcRenderer } from 'electron'
import type { GameShelfApi, LibraryPayload } from '@shared/types'

const api: GameShelfApi = {
  getLibrary: () => ipcRenderer.invoke('library:get'),
  rescan: () => ipcRenderer.invoke('library:rescan'),
  launch: (id) => ipcRenderer.invoke('game:launch', id),
  install: (id) => ipcRenderer.invoke('game:install', id),
  updateGame: (id, patch) => ipcRenderer.invoke('game:update', id, patch),
  resetGame: (id) => ipcRenderer.invoke('game:reset', id),
  addCustomGame: (game) => ipcRenderer.invoke('custom:add', game),
  removeCustomGame: (id) => ipcRenderer.invoke('custom:remove', id),
  pickFile: (kind) => ipcRenderer.invoke('dialog:pick', kind),
  searchCovers: (name) => ipcRenderer.invoke('covers:search', name),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  refreshCovers: () => ipcRenderer.invoke('covers:refresh'),
  openDataFolder: () => ipcRenderer.invoke('app:openData'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen:toggle'),
  isFullscreen: () => ipcRenderer.invoke('window:fullscreen:get'),
  onFullscreenChanged: (cb) => {
    const listener = (_e: unknown, on: boolean): void => cb(on)
    ipcRenderer.on('window:fullscreen', listener)
    return () => ipcRenderer.removeListener('window:fullscreen', listener)
  },
  onLibraryChanged: (cb) => {
    const listener = (_e: unknown, lib: LibraryPayload): void => cb(lib)
    ipcRenderer.on('library:changed', listener)
    return () => ipcRenderer.removeListener('library:changed', listener)
  }
}

contextBridge.exposeInMainWorld('gameshelf', api)
