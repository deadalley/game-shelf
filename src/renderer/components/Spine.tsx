import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Play } from 'lucide-react'
import { isFavorite } from '@shared/favorites'
import type { Game, WrapperId } from '@shared/types'
import { SERVICE_COLORS } from '../lib/services'
import { FavoriteStar, WrappedCover } from './Cover'

/** Width of a case seen from the side, relative to the cover width (a DVD case is ~14mm by 135mm). */
export const SPINE_RATIO = 0.17

export function spineWidth(cardW: number): number {
  return Math.max(22, Math.round(cardW * SPINE_RATIO))
}

interface Props {
  game: Game
  wrapper: WrapperId
  cardW: number
  /** Its details panel is opening or open, so it stays turned to face the viewer. */
  open: boolean
  /** Turn it out first, then open its details panel (keyboard and touch, where there is no hover). */
  onPull(game: Game): void
  /** Open its details panel straight away (it is already facing the viewer). */
  onOpen(game: Game): void
  onPlay(game: Game): void
  onContextMenu(game: Game, x: number, y: number): void
}

const TURN = { type: 'spring', stiffness: 170, damping: 24, mass: 0.9 } as const

/** Pause before a hovered case turns, so sweeping the mouse along the shelf doesn't flip every one. */
const HOVER_INTENT_MS = 120

/**
 * A game standing on the shelf with only its spine showing. Hovering slides it out and turns it to
 * face the viewer; clicking it opens the details panel; the play button in the middle starts the game.
 */
function SpineInner({
  game,
  wrapper,
  cardW,
  open: selected,
  onPull,
  onOpen,
  onPlay,
  onContextMenu
}: Props): JSX.Element {
  const width = spineWidth(cardW)
  const fav = isFavorite(game.collections)
  const canPlay = game.installed || !game.install
  const [hovered, setHovered] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const open = hovered || selected
  const iconSize = open ? 22 : 12

  const turnOut = (): void => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setHovered(true), HOVER_INTENT_MS)
  }
  const turnBack = (): void => {
    window.clearTimeout(timer.current)
    setHovered(false)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const play = (
    <button
      className="spine-play"
      aria-label={canPlay ? `Play ${game.name}` : `Install ${game.name}`}
      onClick={(e) => {
        e.stopPropagation()
        onPlay(game)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {canPlay ? <Play size={iconSize} fill="currentColor" /> : <Download size={iconSize} />}
    </button>
  )

  return (
    <motion.div
      className={`spine-item${open ? ' open' : ''}${game.installed ? '' : ' uninstalled'}${game.hidden ? ' is-hidden' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={game.name}
      title={game.name}
      initial={false}
      animate={{ width: open ? cardW : width }}
      transition={TURN}
      aria-expanded={selected}
      onMouseEnter={turnOut}
      onMouseLeave={turnBack}
      onFocus={turnOut}
      onBlur={turnBack}
      onClick={() => (open ? onOpen(game) : onPull(game))}
      onDoubleClick={() => onPlay(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(game)
        if (e.key === ' ') {
          e.preventDefault()
          onPull(game)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(game, e.clientX, e.clientY)
      }}
    >
      <div className="spine-glow" aria-hidden />
      <div className="spine-lift">
        {/* The spine turns away as the front turns towards the viewer. */}
        <motion.div
          className={`spine spine-${wrapper}`}
          style={{ width, transformOrigin: 'right center', pointerEvents: open ? 'none' : 'auto' }}
          initial={false}
          animate={{ rotateY: open ? -90 : 0, opacity: open ? 0 : 1 }}
          transition={TURN}
        >
          <div
            className="spine-art"
            style={game.coverUrl ? { backgroundImage: `url("${game.coverUrl}")` } : undefined}
          />
          <div className="spine-top">{fav && <FavoriteStar size={Math.min(18, width - 6)} />}</div>
          <div className="spine-title">{game.name}</div>
          <span className="spine-dot" style={{ background: SERVICE_COLORS[game.service] }} />
          {!open && play}
        </motion.div>
        <motion.div
          className="spine-front"
          style={{ width: cardW, transformOrigin: 'left center', pointerEvents: open ? 'auto' : 'none' }}
          initial={false}
          animate={{ rotateY: open ? 0 : 90, opacity: open ? 1 : 0 }}
          transition={TURN}
        >
          <WrappedCover game={game} wrapper={wrapper}>
            <div className="card-overlay spine-front-overlay">{open && play}</div>
          </WrappedCover>
        </motion.div>
      </div>
    </motion.div>
  )
}

export const Spine = memo(SpineInner)
