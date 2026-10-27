import { useEffect, useState } from 'react'
import { ExternalLink, FolderOpen, ImageDown, RefreshCw } from 'lucide-react'
import { SERVICE_LABELS } from '@shared/types'
import { formatDate } from '../../lib/organize'
import { useLibrary } from '../../state/useLibrary'
import { GROUPS, SORTS, Segmented } from '../LayoutPicker'
import { SettingRow, Switch } from './SettingsPage'

export function ViewSection(): JSX.Element {
  const s = useLibrary((st) => st.settings)
  const update = useLibrary((st) => st.updateSettings)
  return (
    <div className="settings-card">
      <SettingRow
        title="Group by"
        description="When grouping by collection, a Favorites collection always comes first."
      >
        <Segmented id="set-group" options={GROUPS} value={s.group} onChange={(group) => update({ group })} />
      </SettingRow>
      <SettingRow title="Sort by">
        <select
          className="input"
          style={{ width: 200 }}
          value={s.sort}
          onChange={(e) => update({ sort: e.target.value as typeof s.sort })}
        >
          {SORTS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        title="Show hidden games"
        description="Hidden games appear on the shelf with a “Hidden” badge."
        onClick={() => update({ showHidden: !s.showHidden })}
      >
        <Switch on={s.showHidden} onChange={(showHidden) => update({ showHidden })} label="Show hidden games" />
      </SettingRow>
    </div>
  )
}

export function CoversSection(): JSX.Element {
  const saved = useLibrary((s) => s.settings.steamGridDbKey)
  const update = useLibrary((s) => s.updateSettings)
  const toast = useLibrary((s) => s.toast)
  const [key, setKey] = useState(saved)
  useEffect(() => setKey(saved), [saved])
  const save = (): void => {
    if (key.trim() !== saved) {
      update({ steamGridDbKey: key.trim() })
      toast(key.trim() ? 'API key saved. Looking for missing covers…' : 'API key removed')
    }
  }
  return (
    <div className="settings-card">
      <div className="setting-row column">
        <div className="setting-text">
          <div className="setting-title">SteamGridDB API key</div>
          <div className="setting-desc">
            Finds covers for games whose launcher doesn't provide one, and powers “Find online” when editing a game. Get
            a free key from your SteamGridDB profile under Preferences → API.{' '}
            <a href="https://www.steamgriddb.com/profile/preferences/api" target="_blank" rel="noreferrer">
              Open SteamGridDB <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <div className="input-row">
          <input
            className="input"
            type="password"
            placeholder="Paste your key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            spellCheck={false}
            autoComplete="off"
          />
          <button className="btn" onClick={save} disabled={key.trim() === saved}>
            Save
          </button>
        </div>
      </div>
      <SettingRow
        title="Missing covers"
        description="Try again to find covers for games that still show a placeholder."
      >
        <button
          className="btn"
          onClick={() => {
            void window.gameshelf.refreshCovers()
            toast('Looking for missing covers…')
          }}
        >
          <ImageDown size={15} /> Refresh
        </button>
      </SettingRow>
    </div>
  )
}

export function ScanSection(): JSX.Element {
  const report = useLibrary((s) => s.library.report)
  const scannedAt = useLibrary((s) => s.library.scannedAt)
  const scanning = useLibrary((s) => s.scanning)
  const rescan = useLibrary((s) => s.rescan)
  return (
    <>
      <div className="section-actions">
        <span className="section-intro">
          Last scan: {scannedAt ? `${formatDate(scannedAt)}, ${new Date(scannedAt).toLocaleTimeString()}` : 'never'}.
          GameShelf scans every time it starts.
        </span>
        <button className="btn" onClick={() => void rescan()} disabled={scanning}>
          <RefreshCw size={14} className={scanning ? 'spin' : ''} /> Scan now
        </button>
      </div>
      <div className="settings-card">
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
      </div>
    </>
  )
}

export function AboutSection(): JSX.Element {
  const [info, setInfo] = useState<{ version: string; dataPath: string; mock: boolean } | null>(null)
  useEffect(() => {
    void window.gameshelf.getAppInfo().then(setInfo)
  }, [])
  return (
    <div className="settings-card">
      <SettingRow
        title={
          <>
            GameShelf {info?.version}
            {info?.mock && <span className="mock-badge">Mock data</span>}
          </>
        }
        description="All your PC games from every launcher, on one shelf."
      />
      <SettingRow title="Data folder" description={<span className="mono">{info?.dataPath}</span>}>
        <button className="btn" onClick={() => void window.gameshelf.openDataFolder()}>
          <FolderOpen size={15} /> Open
        </button>
      </SettingRow>
    </div>
  )
}
