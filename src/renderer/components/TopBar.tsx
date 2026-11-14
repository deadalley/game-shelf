import { useEffect, useRef } from 'react'
import { Download, Eye, Loader2, Maximize, Minimize, Plus, RefreshCw, RotateCw, Search, Settings2 } from 'lucide-react'
import appIcon from '../assets/app-icon.png'
import { useLibrary } from '../state/useLibrary'

export function TopBar(): JSX.Element {
  const search = useLibrary((s) => s.search)
  const scanning = useLibrary((s) => s.scanning)
  const settingsOpen = useLibrary((s) => s.settingsOpen)
  const fullscreen = useLibrary((s) => s.fullscreen)
  const toggleFullscreen = useLibrary((s) => s.toggleFullscreen)
  const setShelfOnly = useLibrary((s) => s.setShelfOnly)
  const total = useLibrary((s) => s.library.games.filter((g) => !g.hidden).length)
  const { setSearch, rescan, setAddOpen, setSettingsOpen } = useLibrary.getState()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="titlebar">
      <div className="brand">
        <img className="brand-mark" src={appIcon} alt="" draggable={false} />
        GameShelf
        <span className="brand-count">
          {total} {total === 1 ? 'game' : 'games'}
        </span>
      </div>
      <div className="search">
        <Search size={15} />
        <input
          ref={inputRef}
          placeholder="Search your library"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
          spellCheck={false}
        />
        {!search && <kbd>Ctrl F</kbd>}
      </div>
      <div className="titlebar-actions">
        <button
          className="btn ghost icon"
          title="Scan launchers again"
          onClick={() => void rescan()}
          disabled={scanning}
        >
          <RefreshCw size={16} className={scanning ? 'spin' : ''} />
        </button>
        <UpdateButton />
        <button className="btn ghost icon" title="Shelf only: hide all menus" onClick={() => setShelfOnly(true)}>
          <Eye size={16} />
        </button>
        <button
          className="btn ghost icon"
          title={fullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
          aria-pressed={fullscreen}
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <button
          className={`btn ghost icon${settingsOpen ? ' active' : ''}`}
          title="Settings"
          aria-pressed={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings2 size={16} />
        </button>
        <button className="btn primary" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add game
        </button>
      </div>
    </header>
  )
}

/** Shows up only while a new version is waiting: download it, watch it download, then restart into it. */
function UpdateButton(): JSX.Element | null {
  const update = useLibrary((s) => s.update)
  const { downloadUpdate, installUpdate } = useLibrary.getState()
  if (update.status === 'available') {
    return (
      <button className="btn update-pill" title={`Download GameShelf ${update.version}`} onClick={downloadUpdate}>
        <Download size={14} /> Update
      </button>
    )
  }
  if (update.status === 'downloading') {
    return (
      <button className="btn update-pill" title={`Downloading GameShelf ${update.version}`} disabled>
        <Loader2 size={14} className="spin" /> {update.percent}%
      </button>
    )
  }
  if (update.status === 'ready') {
    return (
      <button className="btn update-pill" title={`Restart into GameShelf ${update.version}`} onClick={installUpdate}>
        <RotateCw size={14} /> Restart to update
      </button>
    )
  }
  return null
}
