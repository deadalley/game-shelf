import { AnimatePresence, motion } from 'framer-motion'
import { PanelTop } from 'lucide-react'
import { useLibrary } from '../state/useLibrary'

/** In shelf-only mode, the one control left on screen: brings the menus back. */
export function ShelfOnlyExit(): JSX.Element {
  const shelfOnly = useLibrary((s) => s.settings.shelfOnly)
  const setShelfOnly = useLibrary((s) => s.setShelfOnly)
  return (
    <AnimatePresence>
      {shelfOnly && (
        <motion.div
          key="shelf-only-exit"
          className="shelf-only-top"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <button
            className="shelf-only-exit"
            title="Show menus (Esc)"
            aria-label="Show menus"
            onClick={() => setShelfOnly(false)}
          >
            <PanelTop size={17} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
