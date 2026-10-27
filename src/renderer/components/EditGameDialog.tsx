import { useEffect, useState } from 'react'
import { FolderOpen, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import type { LaunchSpec } from '@shared/types'
import { useGame, useLibrary } from '../state/useLibrary'
import { CoverPicker } from './CoverPicker'
import { Dialog } from './Dialog'

export function EditGameDialog(): JSX.Element {
  const editingId = useLibrary((s) => s.editingId)
  const allCollections = useLibrary((s) => s.library.collections)
  const game = useGame(editingId)
  const { edit, setLibrary, select, toast } = useLibrary.getState()

  const [name, setName] = useState('')
  const [cover, setCover] = useState<string | undefined>()
  const [coverChanged, setCoverChanged] = useState(false)
  const [launch, setLaunch] = useState<LaunchSpec>({ type: 'exe', target: '' })
  const [collections, setCollections] = useState<string[]>([])
  const [newCollection, setNewCollection] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!game) return
    setName(game.name)
    setCover(game.coverUrl)
    setCoverChanged(false)
    setLaunch(game.launch ?? { type: 'exe', target: '' })
    setCollections(game.collections)
    setNewCollection('')
    // Only reset when a different game is opened, not on every library refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id])

  const close = (): void => edit(null)
  const isCustom = game?.service === 'custom'

  const save = async (): Promise<void> => {
    if (!game) return
    setSaving(true)
    try {
      const lib = await window.gameshelf.updateGame(game.id, {
        name,
        cover: coverChanged ? cover : undefined,
        launch: launch.target !== game.launch?.target || launch.args !== game.launch?.args ? launch : undefined,
        collections
      })
      setLibrary(lib)
      close()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save changes', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addCollection = (c: string): void => {
    const v = c.trim()
    if (v && !collections.includes(v)) setCollections([...collections, v])
    setNewCollection('')
  }

  const suggestions = allCollections.filter((c) => !collections.includes(c))

  return (
    <Dialog
      open={!!game}
      title="Edit game"
      onClose={close}
      width={680}
      footer={
        <>
          {isCustom ? (
            <button
              className="btn ghost danger"
              onClick={async () => {
                if (!game) return
                setLibrary(await window.gameshelf.removeCustomGame(game.id))
                close()
                select(null)
              }}
            >
              <Trash2 size={15} /> Remove game
            </button>
          ) : (
            <button
              className="btn ghost"
              title="Undo your edits and use what the launcher reports"
              onClick={async () => {
                if (!game) return
                setLibrary(await window.gameshelf.resetGame(game.id))
                close()
              }}
            >
              <RotateCcw size={15} /> Reset to launcher data
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={saving || !name.trim()}>
            Save changes
          </button>
        </>
      }
    >
      <div className="form-grid">
        <CoverPicker
          value={cover}
          searchName={name}
          onChange={(c) => {
            setCover(c)
            setCoverChanged(true)
          }}
        />
        <div className="fields">
          <div className="field">
            <label htmlFor="edit-name">Name</label>
            <input id="edit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <span className="label">Launch</span>
            <div className="input-row">
              <select
                className="input"
                style={{ width: 110, flex: 'none' }}
                value={launch.type}
                onChange={(e) => setLaunch({ ...launch, type: e.target.value as LaunchSpec['type'] })}
              >
                <option value="exe">Program</option>
                <option value="uri">Link</option>
              </select>
              <input
                className="input"
                placeholder={launch.type === 'exe' ? 'C:\\Games\\game.exe' : 'steam://rungameid/…'}
                value={launch.target}
                onChange={(e) => setLaunch({ ...launch, target: e.target.value })}
                spellCheck={false}
              />
              {launch.type === 'exe' && (
                <button
                  className="btn icon"
                  title="Browse"
                  onClick={async () => {
                    const file = await window.gameshelf.pickFile('exe')
                    if (file) setLaunch({ ...launch, target: file })
                  }}
                >
                  <FolderOpen size={15} />
                </button>
              )}
            </div>
            {launch.type === 'exe' && (
              <input
                className="input"
                placeholder="Arguments (optional)"
                value={launch.args ?? ''}
                onChange={(e) => setLaunch({ ...launch, args: e.target.value || undefined })}
                spellCheck={false}
              />
            )}
            {launch.type === 'exe' && (
              <span className="hint">Playtime is tracked automatically for games started as a program.</span>
            )}
          </div>

          <div className="field">
            <span className="label">Collections</span>
            <div className="tag-list">
              {collections.map((c) => (
                <span className="tag" key={c}>
                  {c}
                  <button onClick={() => setCollections(collections.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="input-row">
              <input
                className="input"
                placeholder="New collection"
                list="collection-suggestions"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCollection(newCollection)}
              />
              <datalist id="collection-suggestions">
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <button
                className="btn icon"
                onClick={() => addCollection(newCollection)}
                disabled={!newCollection.trim()}
              >
                <Plus size={15} />
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="tag-list">
                {suggestions.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    className="tag"
                    style={{ border: 0, cursor: 'pointer' }}
                    onClick={() => addCollection(c)}
                  >
                    <Plus size={11} /> {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
