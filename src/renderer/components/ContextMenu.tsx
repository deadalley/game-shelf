import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, EyeOff, Info, Pencil, Play, Star, StarOff } from 'lucide-react'
import { isFavoritesCollection } from '@shared/favorites'
import type { Game } from '@shared/types'
import { useLibrary } from '../state/useLibrary'

export interface MenuTarget {
  game: Game
  x: number
  y: number
}

/** Right-click menu for a game card, positioned at the cursor and kept inside the window. */
export function ContextMenu({ target, onClose }: { target: MenuTarget; onClose(): void }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: target.x, top: target.y })
  const { launch, select, edit, toggleHidden, setLibrary } = useLibrary.getState()
  const { game } = target
  const canPlay = game.installed || !game.install
  const fav = game.collections.some(isFavoritesCollection)

  /** Uses the user's existing favorites collection (whatever its name/language), or creates "Favorites". */
  const setFavorite = async (on: boolean): Promise<void> => {
    const existing = useLibrary.getState().library.collections.find(isFavoritesCollection) ?? 'Favorites'
    const collections = on ? [...game.collections, existing] : game.collections.filter((c) => !isFavoritesCollection(c))
    setLibrary(await window.gameshelf.updateGame(game.id, { collections }))
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      left: Math.min(target.x, window.innerWidth - width - 8),
      top: Math.min(target.y, window.innerHeight - height - 8)
    })
  }, [target])

  useEffect(() => {
    const close = (e: Event): void => {
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return
      onClose()
    }
    // Capture phase: Esc closes just this menu, not the details panel underneath.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('wheel', close, { passive: true })
    window.addEventListener('blur', close)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('wheel', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  const item = (icon: React.ReactNode, label: string, run: () => void): JSX.Element => (
    <button
      className="menu-item"
      onClick={() => {
        onClose()
        run()
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  return (
    <motion.div
      ref={ref}
      className="popover context-menu"
      role="menu"
      style={{ position: 'fixed', left: pos.left, top: pos.top, right: 'auto' }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
    >
      <h4>{game.name}</h4>
      {canPlay
        ? item(<Play size={15} />, 'Play', () => void launch(game))
        : item(<Download size={15} />, 'Install', () => void launch(game))}
      {item(<Info size={15} />, 'Details', () => select(game.id))}
      {item(<Pencil size={15} />, 'Edit…', () => edit(game.id))}
      <div className="menu-sep" />
      {fav
        ? item(<StarOff size={15} />, 'Remove from favorites', () => void setFavorite(false))
        : item(<Star size={15} />, 'Add to favorites', () => void setFavorite(true))}
      {game.hidden
        ? item(<Eye size={15} />, 'Show in library', () => void toggleHidden(game))
        : item(<EyeOff size={15} />, 'Hide from library', () => void toggleHidden(game))}
    </motion.div>
  )
}
