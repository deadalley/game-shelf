import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { SERVICE_LABELS, type Game, type WrapperId } from '@shared/types'
import { placeholderTone } from '../lib/services'

export function CoverArt({ game, children }: { game: Game; children?: React.ReactNode }): JSX.Element {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [game.coverUrl])
  const [a, b] = placeholderTone(game.name)
  return (
    <div className="card-art">
      {game.coverUrl && !failed ? (
        <img src={game.coverUrl} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <div className="placeholder" style={{ background: `linear-gradient(160deg, ${b}, ${a})` }}>
          <div className="ph-initial">{game.name.trim().charAt(0).toUpperCase()}</div>
          <div>{game.name}</div>
          <div className="ph-service">{SERVICE_LABELS[game.service]}</div>
        </div>
      )}
      <div className="glare" />
      {children}
    </div>
  )
}

/** Small round yellow star marking games in a favorites collection. */
export function FavoriteStar({ size = 22 }: { size?: number }): JSX.Element {
  return (
    <span className="fav-star" style={{ width: size, height: size }} title="Favorite" aria-label="Favorite">
      <Star size={Math.round(size * 0.58)} fill="currentColor" strokeWidth={0} />
    </span>
  )
}

/**
 * Case proportions, as fractions of the cover width, measured from PS4 and Xbox retail case templates.
 * Shared by the CSS (through custom properties) and `coverHeight`, so the shelf lines up exactly.
 */
const CASES = {
  ps: { edge: 0.016, band: 0.165, bottom: 0.018 },
  xbox: { edge: 0.016, band: 0.12, bottom: 0.036 }
} as const

const px = (fraction: number): string => `max(2px, calc(var(--card-w) * ${fraction}))`

/** Cover art, optionally inside a PS- or Xbox-style case. */
export function WrappedCover({
  game,
  wrapper,
  children
}: {
  game: Game
  wrapper: WrapperId
  children?: React.ReactNode
}): JSX.Element {
  if (wrapper === 'none') return <CoverArt game={game}>{children}</CoverArt>
  const g = CASES[wrapper]
  const style = { '--edge': px(g.edge), '--band': px(g.band), '--bottom': px(g.bottom) } as React.CSSProperties
  const label = SERVICE_LABELS[game.service]
  return (
    <div className={`case ${wrapper}`} style={style}>
      <div className="case-band">
        <span className="mark" />
        <span className="case-label">{label}</span>
      </div>
      <CoverArt game={game}>
        {wrapper === 'xbox' && (
          <div className="case-strip">
            <span>PC · {label}</span>
          </div>
        )}
        {children}
      </CoverArt>
    </div>
  )
}

/** Height of the visible cover (art or case) for a given card width. */
export function coverHeight(width: number, wrapper: WrapperId): number {
  if (wrapper === 'none') return width * 1.5
  const g = CASES[wrapper]
  const size = (f: number): number => Math.max(2, width * f)
  return size(g.band) + (width - 2 * size(g.edge)) * 1.5 + size(g.bottom)
}
