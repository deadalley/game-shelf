import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ChevronDown, FolderPlus, Gamepad2, RefreshCw } from 'lucide-react'
import type { Game } from '@shared/types'
import { chunk, filterGames, groupGames } from '../lib/organize'
import { useLibrary } from '../state/useLibrary'
import { coverHeight, FavoriteStar } from './Cover'
import { ContextMenu, type MenuTarget } from './ContextMenu'
import { GameCard } from './GameCard'
import { Spine, spineWidth } from './Spine'

/** How long a spine takes to slide out and turn before the details panel opens. */
const PULL_MS = 420

/** Above this many visible games, skip layout animations to keep things smooth. */
const ANIMATE_LIMIT = 220

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

export function Shelf(): JSX.Element {
  const library = useLibrary((s) => s.library)
  const settings = useLibrary((s) => s.settings)
  const search = useLibrary((s) => s.search)
  const collapsed = useLibrary((s) => s.collapsed)
  const scanning = useLibrary((s) => s.scanning)
  const ready = useLibrary((s) => s.ready)
  const selectedId = useLibrary((s) => s.selectedId)
  const { toggleCollapsed, select, launch, rescan, setAddOpen, toggleHidden } = useLibrary.getState()
  const [menu, setMenu] = useState<MenuTarget | null>(null)
  const [pulledId, setPulledId] = useState<string | null>(null)
  const stacked = settings.layout === 'stacked'

  const innerRef = useRef<HTMLDivElement>(null)
  const width = useWidth(innerRef)

  const cardW = settings.coverSize
  // Fit as many covers as the minimum gap allows, then spread the leftover space so rows end flush.
  const minGap = Math.round(Math.max(14, cardW * 0.14))
  const spineW = spineWidth(cardW)
  const SPINE_GAP = 3
  // Stacked rows leave room for one case turned to face the viewer.
  const perRow = stacked
    ? Math.max(1, Math.floor((width - (cardW - spineW) + SPINE_GAP) / (spineW + SPINE_GAP)))
    : Math.max(1, Math.floor((width + minGap) / (cardW + minGap)))
  const gap = stacked
    ? SPINE_GAP
    : perRow > 1
      ? Math.min(cardW * 0.4, Math.floor((width - perRow * cardW) / (perRow - 1)))
      : minGap
  const artH = coverHeight(cardW, settings.wrapper)

  const visible = useMemo(() => filterGames(library.games, settings, search), [library.games, settings, search])
  const groups = useMemo(() => groupGames(visible, settings), [visible, settings])
  const animate = visible.length <= ANIMATE_LIMIT

  const cardSettings = useMemo(
    () => ({
      wrapper: settings.wrapper,
      showTitles: settings.showTitles,
      showPlaytime: settings.showPlaytime,
      theme: settings.theme
    }),
    [settings.wrapper, settings.showTitles, settings.showPlaytime, settings.theme]
  )
  const onOpen = useCallback((g: Game) => select(g.id), [select])
  const onPlay = useCallback((g: Game) => void launch(g), [launch])
  const onToggleHidden = useCallback((g: Game) => void toggleHidden(g), [toggleHidden])
  const onContextMenu = useCallback((game: Game, x: number, y: number) => setMenu({ game, x, y }), [])
  // Stacked: slide the case out and turn it first, then open the details panel.
  const onPull = useCallback(
    (g: Game) => {
      setPulledId(g.id)
      window.setTimeout(() => select(g.id), useLibrary.getState().settings.animations ? PULL_MS : 0)
    },
    [select]
  )
  // Put the case back on the shelf when its details panel closes.
  useEffect(() => {
    if (!selectedId) setPulledId(null)
  }, [selectedId])
  const closeMenu = useCallback(() => setMenu(null), [])

  const style = {
    '--card-w': `${cardW}px`,
    '--gap': `${gap}px`,
    '--art-h': `${artH}px`
  } as React.CSSProperties

  return (
    <main className={`stage theme-${settings.theme}`} style={style}>
      <div className="stage-inner" ref={innerRef}>
        {ready && visible.length === 0 ? (
          <EmptyState
            hasGames={library.games.length > 0}
            scanning={scanning}
            onRescan={() => void rescan()}
            onAdd={() => setAddOpen(true)}
          />
        ) : (
          <LayoutGroup>
            {groups.map((group) => {
              const isCollapsed = collapsed[group.key]
              const showHeader = settings.group !== 'none'
              return (
                <section className="group" key={group.key}>
                  {showHeader && (
                    <button
                      className={`group-header${isCollapsed ? ' collapsed' : ''}`}
                      onClick={() => toggleCollapsed(group.key)}
                      aria-expanded={!isCollapsed}
                    >
                      <ChevronDown size={16} />
                      {group.favorite && <FavoriteStar size={20} />}
                      <h2>{group.title}</h2>
                      <span className="count">{group.games.length}</span>
                    </button>
                  )}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        key="rows"
                        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                      >
                        {chunk(group.games, perRow).map((row, i) => (
                          <div className={`shelf-row${stacked ? ' stacked' : ''}`} key={i}>
                            <div className="plank" />
                            <AnimatePresence initial={false} mode="popLayout">
                              {row.map((game) => (
                                <motion.div
                                  key={game.id}
                                  layoutId={animate ? `${group.key}/${game.id}` : undefined}
                                  layout={animate ? 'position' : false}
                                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.92 }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
                                >
                                  {stacked ? (
                                    <Spine
                                      game={game}
                                      wrapper={settings.wrapper}
                                      cardW={cardW}
                                      open={pulledId === game.id || selectedId === game.id}
                                      onPull={onPull}
                                      onPlay={onPlay}
                                      onContextMenu={onContextMenu}
                                    />
                                  ) : (
                                    <GameCard
                                      game={game}
                                      settings={cardSettings}
                                      onOpen={onOpen}
                                      onPlay={onPlay}
                                      onToggleHidden={onToggleHidden}
                                      onContextMenu={onContextMenu}
                                    />
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )
            })}
          </LayoutGroup>
        )}
      </div>
      {menu && <ContextMenu target={menu} onClose={closeMenu} />}
    </main>
  )
}

function EmptyState(props: { hasGames: boolean; scanning: boolean; onRescan(): void; onAdd(): void }): JSX.Element {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <Gamepad2 size={44} strokeWidth={1.4} />
        <h3>
          {props.hasGames ? 'No games match' : props.scanning ? 'Looking for your games…' : 'Your shelf is empty'}
        </h3>
        <div>
          {props.hasGames
            ? 'Try a different search or clear some filters.'
            : 'GameShelf reads Steam, Xbox, GOG, Epic, EA, Ubisoft and Battle.net. You can also add any game yourself.'}
        </div>
        {!props.hasGames && (
          <div className="actions">
            <button className="btn" onClick={props.onRescan} disabled={props.scanning}>
              <RefreshCw size={15} className={props.scanning ? 'spin' : ''} /> Scan again
            </button>
            <button className="btn primary" onClick={props.onAdd}>
              <FolderPlus size={15} /> Add a game
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
