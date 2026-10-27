import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { useLibrary } from '../state/useLibrary'
import { CoverPicker } from './CoverPicker'
import { Dialog } from './Dialog'

export function AddGameDialog(): JSX.Element {
  const open = useLibrary((s) => s.addOpen)
  const { setAddOpen, setLibrary, toast } = useLibrary.getState()

  const [name, setName] = useState('')
  const [exePath, setExePath] = useState('')
  const [args, setArgs] = useState('')
  const [cover, setCover] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setExePath('')
      setArgs('')
      setCover(undefined)
    }
  }, [open])

  const browse = async (): Promise<void> => {
    const file = await window.gameshelf.pickFile('exe')
    if (!file) return
    setExePath(file)
    if (!name) {
      const base =
        file
          .split(/[\\/]/)
          .pop()
          ?.replace(/\.[^.]+$/, '') ?? ''
      setName(base.replace(/[_-]+/g, ' '))
    }
  }

  const valid = name.trim() && exePath.trim() && cover
  const save = async (): Promise<void> => {
    if (!valid || !cover) return
    setSaving(true)
    try {
      setLibrary(await window.gameshelf.addCustomGame({ name, exePath, args: args || undefined, cover }))
      toast(`${name} added to your shelf`)
      setAddOpen(false)
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
          : 'Could not add game',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Add a game"
      onClose={() => setAddOpen(false)}
      width={680}
      footer={
        <>
          <span className="hint" style={{ color: 'var(--text-3)', fontSize: 12 }}>
            Name, program and cover are required.
          </span>
          <span className="spacer" />
          <button className="btn" onClick={() => setAddOpen(false)}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={!valid || saving}>
            Add to shelf
          </button>
        </>
      }
    >
      <div className="form-grid">
        <CoverPicker value={cover} searchName={name} onChange={setCover} />
        <div className="fields">
          <div className="field">
            <label htmlFor="add-exe">Program</label>
            <div className="input-row">
              <input
                id="add-exe"
                className="input"
                placeholder="C:\Games\MyGame\game.exe"
                value={exePath}
                onChange={(e) => setExePath(e.target.value)}
                spellCheck={false}
              />
              <button className="btn" onClick={() => void browse()}>
                <FolderOpen size={15} /> Browse
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="add-name">Name</label>
            <input id="add-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="add-args">Arguments</label>
            <input
              id="add-args"
              className="input"
              placeholder="Optional"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              spellCheck={false}
            />
            <span className="hint">GameShelf tracks how long you play games you add here.</span>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
