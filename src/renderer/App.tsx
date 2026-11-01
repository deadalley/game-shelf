import { useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { AddGameDialog } from './components/AddGameDialog'
import { ControllerHints } from './components/ControllerHints'
import { EditGameDialog } from './components/EditGameDialog'
import { GameDrawer } from './components/GameDrawer'
import { SettingsPage } from './components/settings/SettingsPage'
import { Shelf } from './components/Shelf'
import { Toolbar } from './components/Toolbar'
import { TopBar } from './components/TopBar'
import { useGamepadNav } from './hooks/useGamepadNav'
import { useLibrary } from './state/useLibrary'

export function App(): JSX.Element {
  const toasts = useLibrary((s) => s.toasts)
  const settingsOpen = useLibrary((s) => s.settingsOpen)
  const animations = useLibrary((s) => s.settings.animations)
  const dismissToast = useLibrary((s) => s.dismissToast)
  const colorMode = useLibrary((s) => s.settings.colorMode)

  useEffect(() => {
    void useLibrary.getState().init()
  }, [])

  useGamepadNav()

  useEffect(() => {
    document.body.classList.toggle('no-anim', !animations)
  }, [animations])

  useEffect(() => {
    document.documentElement.dataset.theme = colorMode
  }, [colorMode])

  // Height of the title bar plus toolbar; the details panel opens below it.
  useEffect(() => {
    const toolbar = document.querySelector('.toolbar')
    if (!toolbar) return
    const update = (): void =>
      document.documentElement.style.setProperty('--chrome-h', `${toolbar.getBoundingClientRect().bottom}px`)
    const ro = new ResizeObserver(update)
    ro.observe(toolbar)
    update()
    return () => ro.disconnect()
  }, [])

  return (
    <MotionConfig reducedMotion={animations ? 'user' : 'always'}>
      <div className="app">
        <TopBar />
        <Toolbar />
        <Shelf />
      </div>
      <AnimatePresence>{settingsOpen && <SettingsPage key="settings" />}</AnimatePresence>
      <GameDrawer />
      <EditGameDialog />
      <AddGameDialog />
      <ControllerHints />
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.kind}${t.action ? ' with-action' : ''}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
            >
              <span>{t.text}</span>
              {t.action && (
                <>
                  <button
                    className="toast-action"
                    onClick={() => {
                      t.action?.run()
                      dismissToast(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                  <button className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
                    <X size={14} />
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
