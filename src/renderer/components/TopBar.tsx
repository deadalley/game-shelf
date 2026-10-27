import { useEffect, useRef } from 'react'
import { Library, Plus, RefreshCw, Search, Settings2 } from 'lucide-react'
import { useLibrary } from '../state/useLibrary'

export function TopBar(): JSX.Element {
  const search = useLibrary((s) => s.search)
  const scanning = useLibrary((s) => s.scanning)
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
        <span className="brand-mark">
          <Library size={14} />
        </span>
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
        <button className="btn ghost icon" title="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings2 size={16} />
        </button>
        <button className="btn primary" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add game
        </button>
      </div>
    </header>
  )
}
