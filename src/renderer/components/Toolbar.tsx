import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownUp, ChevronDown, GalleryVertical, LayoutGrid, Layers, Palette, SlidersHorizontal } from 'lucide-react'
import { SERVICES, SERVICE_LABELS, type InstallFilter, type Service } from '@shared/types'
import { coverSizePercent } from '../lib/organize'
import { SERVICE_COLORS } from '../lib/services'
import { useLibrary } from '../state/useLibrary'
import {
  GROUPS,
  SORTS,
  Segmented,
  ShelfBackgroundSlider,
  ThemePicker,
  WrapperPicker,
  shelfBackgroundLabel
} from './LayoutPicker'
import { MenuItem, Popover, SwitchRow } from './Popover'

const INSTALL: { id: InstallFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'installed', label: 'Installed' },
  { id: 'uninstalled', label: 'Not installed' }
]

export function Toolbar(): JSX.Element {
  const settings = useLibrary((s) => s.settings)
  const games = useLibrary((s) => s.library.games)
  const update = useLibrary((s) => s.updateSettings)
  const acrylic = useLibrary((s) => s.acrylic)

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
            <Layers size={15} />{' '}
            {settings.group === 'none' ? 'No grouping' : `Group: ${GROUPS.find((g) => g.id === settings.group)?.label}`}
            <ChevronDown size={14} />
          </button>
        )}
      >
        {(close) => (
          <>
            <h4>Group by</h4>
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

      <div className="segmented icon-toggle" role="radiogroup" aria-label="Layout">
        {(
          [
            { id: 'flat', label: 'Flat: covers facing out', Icon: LayoutGrid },
            { id: 'stacked', label: 'Stacked: spines side by side', Icon: GalleryVertical }
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={settings.layout === id}
            title={label}
            className={settings.layout === id ? 'active' : ''}
            onClick={() => update({ layout: id })}
          >
            {settings.layout === id && (
              <motion.span
                layoutId="seg-layout"
                className="seg-bg"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Icon size={15} />
          </button>
        ))}
      </div>

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
            <span>{coverSizePercent(settings.coverSize)}%</span>
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
          <button className="btn icon" onClick={toggle} aria-expanded={open} title="Shelf style">
            <Palette size={15} />
          </button>
        )}
      >
        <h4>Shelf</h4>
        <ThemePicker value={settings.theme} onChange={(theme) => update({ theme })} />
        <h4>Covers</h4>
        <WrapperPicker value={settings.wrapper} onChange={(wrapper) => update({ wrapper })} />
        <div className="range-row">
          <label>
            <span>Background</span>
            <span>{acrylic ? shelfBackgroundLabel(settings.shelfBackground) : 'Needs Windows 11'}</span>
          </label>
          <ShelfBackgroundSlider
            value={settings.shelfBackground}
            supported={acrylic}
            onChange={(shelfBackground) => update({ shelfBackground })}
          />
        </div>
      </Popover>
    </div>
  )
}
