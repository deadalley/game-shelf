import { useMemo } from 'react'
import { LAUNCHERS, SERVICE_LABELS, type Service } from '@shared/types'
import { SERVICE_COLORS } from '../../lib/services'
import { useLibrary } from '../../state/useLibrary'
import { SettingRow, Switch } from './SettingsPage'

export function LibrariesSection(): JSX.Element {
  const settings = useLibrary((s) => s.settings)
  const games = useLibrary((s) => s.library.games)
  const report = useLibrary((s) => s.library.report)
  const update = useLibrary((s) => s.updateSettings)

  const counts = useMemo(() => {
    const c: Partial<Record<Service, number>> = {}
    for (const g of games) c[g.service] = (c[g.service] ?? 0) + 1
    return c
  }, [games])

  const setEnabled = (svc: Service, enabled: boolean): void => {
    const disabled = new Set(settings.disabledServices)
    if (enabled) disabled.delete(svc)
    else disabled.add(svc)
    // Drop a filter chip for a launcher that's going away, or the shelf could end up empty.
    update({ disabledServices: [...disabled], services: settings.services.filter((s) => s !== svc || enabled) })
  }

  const status = (svc: Service): string => {
    if (settings.disabledServices.includes(svc)) return 'Off. Not scanned or shown.'
    const r = report.find((e) => e.service === svc)
    const n = counts[svc] ?? 0
    if (r && !r.ok) return `Scan failed: ${r.message}`
    if (n === 0) return r?.message ?? 'No games found'
    return `${n} ${n === 1 ? 'game' : 'games'}`
  }

  return (
    <>
      <p className="section-intro">
        Choose which launchers GameShelf reads. Switching one off hides its games and skips it when scanning. Your edits
        to those games are kept.
      </p>
      <div className="settings-card">
        {LAUNCHERS.map((svc) => {
          const on = !settings.disabledServices.includes(svc)
          return (
            <SettingRow
              key={svc}
              title={
                <span className={`lib-name${on ? '' : ' off'}`}>
                  <span className="svc-dot" style={{ background: SERVICE_COLORS[svc] }} />
                  {SERVICE_LABELS[svc]}
                </span>
              }
              description={status(svc)}
              onClick={() => setEnabled(svc, !on)}
            >
              <Switch on={on} onChange={(v) => setEnabled(svc, v)} label={`Show ${SERVICE_LABELS[svc]} games`} />
            </SettingRow>
          )
        })}
        <SettingRow
          title={
            <span className="lib-name">
              <span className="svc-dot" style={{ background: SERVICE_COLORS.custom }} />
              Games you added
            </span>
          }
          description={`${counts.custom ?? 0} ${counts.custom === 1 ? 'game' : 'games'} · always shown`}
        />
      </div>
    </>
  )
}
