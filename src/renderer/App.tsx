import { useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { AddGameDialog } from './components/AddGameDialog'
import { EditGameDialog } from './components/EditGameDialog'
import { GameDrawer } from './components/GameDrawer'
import { SettingsDialog } from './components/SettingsDialog'
import { Shelf } from './components/Shelf'
import { Toolbar } from './components/Toolbar'
import { TopBar } from './components/TopBar'
import { useLibrary } from './state/useLibrary'

export function App(): JSX.Element {
  const toasts = useLibrary((s) => s.toasts)

  useEffect(() => {
    void useLibrary.getState().init()
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <TopBar />
        <Toolbar />
        <Shelf />
      </div>
      <GameDrawer />
      <EditGameDialog />
      <AddGameDialog />
      <SettingsDialog />
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.kind}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
