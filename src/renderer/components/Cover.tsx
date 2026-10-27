import { useEffect, useState } from 'react'
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
  return (
    <div className={`case ${wrapper}`}>
      <div className="case-band">
        <span className="mark" />
        <span>{SERVICE_LABELS[game.service]}</span>
        {wrapper === 'ps' && <span className="tail">PC</span>}
      </div>
      <CoverArt game={game}>{children}</CoverArt>
    </div>
  )
}

/** Height of the visible cover (art or case) for a given card width. */
export function coverHeight(width: number, wrapper: WrapperId): number {
  if (wrapper === 'none') return width * 1.5
  const edge = Math.max(3, width * 0.03)
  const band = width * 0.12
  return band + (width - 2 * edge) * 1.5 + edge
}
