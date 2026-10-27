import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownUp, ChevronDown, LayoutGrid, Layers, SlidersHorizontal } from 'lucide-react'
import {
  SERVICES,
  SERVICE_LABELS,
  type GroupId,
  type InstallFilter,
  type Service,
  type SortId,
  type ThemeId,
  type WrapperId
} from '@shared/types'
import { SERVICE_COLORS } from '../lib/services'
import { useLibrary } from '../state/useLibrary'
import { MenuItem, Popover, SwitchRow } from './Popover'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'lastPlayed', label: 'Last played' },
  { id: 'playtime', label: 'Most played' },
  { id: 'installedAt', label: 'Recently installed' }
]

const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'none', label: 'One shelf' },
  { id: 'service', label: 'By service' },
  { id: 'collection', label: 'By collection' }
]

const INSTALL: { id: InstallFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'installed', label: 'Installed' },
  { id: 'uninstalled', label: 'Not installed' }
]

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'clean', label: 'Clean' },
  { id: 'old', label: 'Old shelf' },
  { id: 'modern', label: 'Modern shelf' },
  { id: 'pixel', label: 'Pixel shelf' }
]

const WRAPPERS: { id: WrapperId; label: string }[] = [
  { id: 'none', label: 'No case' },
  { id: 'ps', label: 'PS case' },
  { id: 'xbox', label: 'Xbox case' }
]

const BOOK_COLORS = ['#c2b8a3', '#8aa1b1', '#b48b7d', '#9fae8f', '#a99bb8']

export function Toolbar(): JSX.Element {
  const settings = useLibrary((s) => s.settings)
  const games = useLibrary((s) => s.library.games)
  const update = useLibrary((s) => s.updateSettings)

  const counts = useMemo(() => {
    const c = {} as Record<Service, number>
    for (const g of games) if (settings.showHidden || !g.hidden) c[g.service] = (c[g.service] ?? 0) + 1
    return c
  }, [games, settings.showHidden])

  const present = SERVICES.filter((s) => counts[s])
  const toggleService = (s: Service): void => {
    const set = new Set(settings.services)
    if (set.has(s)) set.delete(s)
    else set.add(s)
    update({ services: [...set] })
  }

  return (
    <div className="toolbar">
      <div className="chips">
        <button
          className={`chip${settings.services.length === 0 ? ' active' : ''}`}
          onClick={() => update({ services: [] })}
        >
          All services
        </button>
        {present.map((s) => (
          <button
            key={s}
            className={`chip${settings.services.includes(s) ? ' active' : ''}`}
            onClick={() => toggleService(s)}
          >
            <span className="svc-dot" style={{ background: SERVICE_COLORS[s] }} />
            {SERVICE_LABELS[s]}
            <span className="count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <Segmented
        id="install"
        options={INSTALL}
        value={settings.installFilter}
        onChange={(installFilter) => update({ installFilter })}
      />

      <Popover
        trigger={(open, toggle) => (
          <button className="btn" onClick={toggle} aria-expanded={open}>
            <Layers size={15} /> {GROUPS.find((g) => g.id === settings.group)?.label}
            <ChevronDown size={14} />
          </button>
        )}
      >
        {(close) => (
          <>
            <h4>Organize</h4>
            {GROUPS.map((g) => (
              <MenuItem
                key={g.id}
                active={settings.group === g.id}
                onClick={() => {
                  update({ group: g.id })
                  close()
                }}
              >
                {g.label}
              </MenuItem>
            ))}
          </>
        )}
      </Popover>

      <Popover
        trigger={(open, toggle) => (
          <button className="btn" onClick={toggle} aria-expanded={open}>
            <ArrowDownUp size={15} /> {SORTS.find((s) => s.id === settings.sort)?.label}
            <ChevronDown size={14} />
          </button>
        )}
      >
        {(close) => (
          <>
            <h4>Sort by</h4>
            {SORTS.map((s) => (
              <MenuItem
                key={s.id}
                active={settings.sort === s.id}
                onClick={() => {
                  update({ sort: s.id })
                  close()
                }}
              >
                {s.label}
              </MenuItem>
            ))}
          </>
        )}
      </Popover>

      <Popover
        width={260}
        trigger={(open, toggle) => (
          <button className="btn icon" onClick={toggle} aria-expanded={open} title="Display">
            <SlidersHorizontal size={15} />
          </button>
        )}
      >
        <h4>Display</h4>
        <SwitchRow label="Show titles" on={settings.showTitles} onChange={(showTitles) => update({ showTitles })} />
        <SwitchRow
          label="Show hours played"
          on={settings.showPlaytime}
          onChange={(showPlaytime) => update({ showPlaytime })}
        />
        <SwitchRow
          label="Show hidden games"
          on={settings.showHidden}
          onChange={(showHidden) => update({ showHidden })}
        />
        <div className="menu-sep" />
        <div className="range-row">
          <label>
            <span>Cover size</span>
            <span>{settings.coverSize}px</span>
          </label>
          <input
            type="range"
            min={100}
            max={240}
            step={5}
            value={settings.coverSize}
            onChange={(e) => update({ coverSize: Number(e.target.value) })}
          />
        </div>
      </Popover>

      <Popover
        width={330}
        trigger={(open, toggle) => (
          <button className="btn icon" onClick={toggle} aria-expanded={open} title="Layout">
            <LayoutGrid size={15} />
          </button>
        )}
      >
        <h4>Shelf</h4>
        <div className="layout-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`layout-option${settings.theme === t.id ? ' active' : ''}`}
              onClick={() => update({ theme: t.id })}
            >
              <div className={`thumb t-${t.id}`}>
                <div className="mini-books">
                  {BOOK_COLORS.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
                <div className="mini-plank" />
              </div>
              {t.label}
            </button>
          ))}
        </div>
        <h4>Covers</h4>
        <div className="layout-grid three">
          {WRAPPERS.map((w) => (
            <button
              key={w.id}
              className={`layout-option${settings.wrapper === w.id ? ' active' : ''}`}
              onClick={() => update({ wrapper: w.id })}
            >
              <div className="thumb" style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
                <WrapperThumb id={w.id} />
              </div>
              {w.label}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  )
}

function WrapperThumb({ id }: { id: WrapperId }): JSX.Element {
  const band = id === 'ps' ? '#0b2f78' : id === 'xbox' ? '#1a8f1a' : undefined
  const shell = id === 'ps' ? '#2a62c4' : id === 'xbox' ? '#2b9a2b' : undefined
  return (
    <div
      style={{
        width: 30,
        height: 42,
        borderRadius: 3,
        padding: shell ? '0 2px 2px' : 0,
        background: shell ?? 'transparent',
        boxShadow: '0 2px 5px rgba(0,0,0,.2)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {band && <div style={{ height: 5, background: band, margin: '0 -2px' }} />}
      <div style={{ flex: 1, background: 'linear-gradient(160deg,#8aa1b1,#3d4a55)', borderRadius: shell ? 1 : 3 }} />
    </div>
  )
}

function Segmented<T extends string>({
  id,
  options,
  value,
  onChange
}: {
  id: string
  options: { id: T; label: string }[]
  value: T
  onChange(v: T): void
}): JSX.Element {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? 'active' : ''}
          onClick={() => onChange(o.id)}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${id}`}
              className="seg-bg"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}
