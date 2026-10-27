import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Eye, EyeOff, Pencil, Play, X } from 'lucide-react'
import { SERVICE_LABELS } from '@shared/types'
import { formatDate, formatPlaytime } from '../lib/organize'
import { SERVICE_COLORS } from '../lib/services'
import { useGame, useLibrary } from '../state/useLibrary'
import { WrappedCover } from './Cover'

export function GameDrawer(): JSX.Element {
  const selectedId = useLibrary((s) => s.selectedId)
  const wrapper = useLibrary((s) => s.settings.wrapper)
  const game = useGame(selectedId)
  const { select, edit, launch, toggleHidden } = useLibrary.getState()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !useLibrary.getState().editingId) select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  const canPlay = game && (game.installed || !game.install)

  return (
    <AnimatePresence>
      {game && (
        <>
          <motion.div
            key="scrim"
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => select(null)}
          />
          <motion.aside
            key="drawer"
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            style={{ '--card-w': '200px' } as React.CSSProperties}
          >
            <div className="drawer-hero">
              {game.coverUrl && <div className="bg" style={{ backgroundImage: `url("${game.coverUrl}")` }} />}
              <button className="btn ghost icon drawer-close" onClick={() => select(null)} aria-label="Close">
                <X size={18} />
              </button>
              <motion.div
                className="cover"
                initial={{ y: 20, opacity: 0, rotate: -2 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 24 }}
              >
                <WrappedCover game={game} wrapper={wrapper} />
              </motion.div>
            </div>
            <div className="drawer-body">
              <h2>{game.name}</h2>
              <span className="service-tag">
                <span className="svc-dot" style={{ background: SERVICE_COLORS[game.service] }} />
                {SERVICE_LABELS[game.service]}
                {!game.installed && ' · Not installed'}
              </span>

              <div className="drawer-actions">
                <button className="btn primary lg" onClick={() => void launch(game)}>
                  {canPlay ? (
                    <>
                      <Play size={16} fill="currentColor" /> Play
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Install
                    </>
                  )}
                </button>
                <button className="btn lg" onClick={() => edit(game.id)}>
                  <Pencil size={15} /> Edit
                </button>
                <button
                  className="btn lg icon"
                  title={game.hidden ? 'Show in library' : 'Hide from library'}
                  onClick={() => void toggleHidden(game)}
                >
                  {game.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              <div className="stats">
                <div className="stat">
                  <div className="label">Played</div>
                  <div className="value">{formatPlaytime(game.playtimeMinutes) ?? '—'}</div>
                </div>
                <div className="stat">
                  <div className="label">Last played</div>
                  <div className="value">{formatDate(game.lastPlayed)}</div>
                </div>
                <div className="stat">
                  <div className="label">Installed</div>
                  <div className="value">{game.installed ? formatDate(game.installedAt) : 'No'}</div>
                </div>
                <div className="stat">
                  <div className="label">Collections</div>
                  <div className="value">{game.collections.length || '—'}</div>
                </div>
              </div>

              <div className="detail-list">
                {game.collections.length > 0 && (
                  <div>
                    <div className="label">Collections</div>
                    <div className="tag-list">
                      {game.collections.map((c) => (
                        <span className="tag" key={c}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {game.installPath && (
                  <div>
                    <div className="label">Location</div>
                    <div className="mono">{game.installPath}</div>
                  </div>
                )}
                {game.launch && (
                  <div>
                    <div className="label">Launches with</div>
                    <div className="mono">
                      {game.launch.target}
                      {game.launch.args ? ` ${game.launch.args}` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
