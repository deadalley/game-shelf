import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { SERVICE_LABELS } from '@shared/types'
import { formatDate } from '../lib/organize'
import { useLibrary } from '../state/useLibrary'
import { Dialog } from './Dialog'

export function SettingsDialog(): JSX.Element {
  const open = useLibrary((s) => s.settingsOpen)
  const settings = useLibrary((s) => s.settings)
  const report = useLibrary((s) => s.library.report)
  const scannedAt = useLibrary((s) => s.library.scannedAt)
  const scanning = useLibrary((s) => s.scanning)
  const { setSettingsOpen, updateSettings, rescan } = useLibrary.getState()
  const [key, setKey] = useState(settings.steamGridDbKey)

  useEffect(() => {
    if (open) setKey(settings.steamGridDbKey)
  }, [open, settings.steamGridDbKey])

  const close = (): void => {
    if (key !== settings.steamGridDbKey) updateSettings({ steamGridDbKey: key.trim() })
    setSettingsOpen(false)
  }

  return (
    <Dialog
      open={open}
      title="Settings"
      onClose={close}
      width={600}
      footer={
        <>
          <span className="spacer" />
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="sgdb-key">SteamGridDB API key</label>
        <input
          id="sgdb-key"
          className="input"
          type="password"
          placeholder="Paste your key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <span className="hint">
          Used to find covers for games whose launcher doesn't provide one, and for the &ldquo;Find online&rdquo;
          search. Get a free key from your SteamGridDB profile under Preferences → API.{' '}
          <a href="https://www.steamgriddb.com/profile/preferences/api" target="_blank" rel="noreferrer">
            Open SteamGridDB <ExternalLink size={11} />
          </a>
        </span>
      </div>

      <div className="field" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="label">Scan report</span>
          <button className="btn ghost" onClick={() => void rescan()} disabled={scanning}>
            <RefreshCw size={14} className={scanning ? 'spin' : ''} /> Scan now
          </button>
        </div>
        <table className="report">
          <tbody>
            {report.map((r) => (
              <tr key={r.service}>
                <td>
                  <span className={`status-dot${!r.ok ? ' err' : r.found === 0 ? ' warn' : ''}`} />
                  {SERVICE_LABELS[r.service]}
                </td>
                <td className="msg">{r.ok ? (r.message ?? '') : `Error: ${r.message}`}</td>
                <td className="num">
                  {r.found} {r.found === 1 ? 'game' : 'games'}
                </td>
                <td className="num">{(r.durationMs / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="hint">
          Last scan: {scannedAt ? `${formatDate(scannedAt)}, ${new Date(scannedAt).toLocaleTimeString()}` : 'never'}
        </span>
      </div>
    </Dialog>
  )
}
