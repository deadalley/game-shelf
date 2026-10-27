import { memo, useRef } from 'react'
import { Clock, Download, EyeOff, Play } from 'lucide-react'
import type { Game, Settings } from '@shared/types'
import { formatPlaytime } from '../lib/organize'
import { WrappedCover } from './Cover'

interface Props {
  game: Game
  settings: Pick<Settings, 'wrapper' | 'showTitles' | 'showPlaytime' | 'theme'>
  onOpen(game: Game): void
  onPlay(game: Game): void
}

function GameCardInner({ game, settings, onOpen, onPlay }: Props): JSX.Element {
  const tiltRef = useRef<HTMLDivElement>(null)
  const pixel = settings.theme === 'pixel'
  const playtime = formatPlaytime(game.playtimeMinutes)
  const canPlay = game.installed || !game.install

  const onMove = (e: React.MouseEvent): void => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transform = pixel
      ? 'translateY(-8px)'
      : `translateY(-6px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg)`
    el.style.setProperty('--gx', `${x * 100}%`)
    el.style.setProperty('--gy', `${y * 100}%`)
  }
  const onLeave = (): void => {
    if (tiltRef.current) tiltRef.current.style.transform = ''
  }

  return (
    <div
      className={`card${game.installed ? '' : ' uninstalled'}`}
      role="button"
      tabIndex={0}
      aria-label={game.name}
      title={game.name}
      onClick={() => onOpen(game)}
      onDoubleClick={() => onPlay(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(game)
        if (e.key === ' ') {
          e.preventDefault()
          onOpen(game)
        }
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="card-tilt" ref={tiltRef}>
        <WrappedCover game={game} wrapper={settings.wrapper}>
          <div className="card-badges">
            {!game.installed ? <span className="badge">Not installed</span> : <span />}
            {game.hidden && (
              <span className="badge">
                <EyeOff size={10} /> Hidden
              </span>
            )}
          </div>
          <div className="card-overlay">
            <button
              className={`play-btn${canPlay ? '' : ' install'}`}
              aria-label={canPlay ? `Play ${game.name}` : `Install ${game.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onPlay(game)
              }}
            >
              {canPlay ? (
                <Play size={22} fill="currentColor" />
              ) : (
                <>
                  <Download size={14} /> Install
                </>
              )}
            </button>
          </div>
        </WrappedCover>
      </div>
      {(settings.showTitles || (settings.showPlaytime && playtime)) && (
        <div className="card-meta">
          {settings.showTitles && <div className="card-title">{game.name}</div>}
          {settings.showPlaytime && playtime && (
            <div className="card-sub">
              <Clock size={11} /> {playtime}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const GameCard = memo(GameCardInner)
