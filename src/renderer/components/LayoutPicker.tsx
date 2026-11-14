import { motion } from 'framer-motion'
import type { GroupId, LayoutId, SortId, ThemeId, WrapperId } from '@shared/types'

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'lastPlayed', label: 'Last played' },
  { id: 'playtime', label: 'Most played' }
]

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'service', label: 'Service' },
  { id: 'collection', label: 'Collection' }
]

export const LAYOUTS: { id: LayoutId; label: string }[] = [
  { id: 'flat', label: 'Flat' },
  { id: 'stacked', label: 'Stacked' }
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

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange(v: ThemeId): void }): JSX.Element {
  return (
    <div className="layout-grid">
      {THEMES.map((t) => (
        <button key={t.id} className={`layout-option${value === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
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
  )
}

export function WrapperPicker({ value, onChange }: { value: WrapperId; onChange(v: WrapperId): void }): JSX.Element {
  return (
    <div className="layout-grid three">
      {WRAPPERS.map((w) => (
        <button key={w.id} className={`layout-option${value === w.id ? ' active' : ''}`} onClick={() => onChange(w.id)}>
          <div className="thumb" style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
            <WrapperThumb id={w.id} />
          </div>
          {w.label}
        </button>
      ))}
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

export function Segmented<T extends string>({
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

/** How solid the shelf wall is: 100% is the normal wall, lower dims it over the blurred desktop, 0% leaves only the blur. */
export function shelfBackgroundLabel(value: number): string {
  if (value >= 100) return 'Solid'
  if (value <= 0) return 'None'
  return `${value}%`
}

export function ShelfBackgroundSlider({
  value,
  supported,
  onChange,
  width
}: {
  value: number
  supported: boolean
  onChange(value: number): void
  width?: number
}): JSX.Element {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={supported ? value : 100}
      disabled={!supported}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Shelf background"
      style={width ? { width } : undefined}
    />
  )
}
