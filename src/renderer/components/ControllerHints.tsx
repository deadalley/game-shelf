import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLibrary, type ControllerContext } from '../state/useLibrary'

type Glyph = 'A' | 'B' | 'X' | 'Y' | 'LB/RB' | 'LT/RT' | 'LS' | 'RS' | 'View' | 'Menu' | 'D-pad'
type Hint = [Glyph, string]

/** What each button does in each part of the app. */
export const HINTS: Record<ControllerContext, Hint[]> = {
  shelf: [
    ['D-pad', 'Move'],
    ['A', 'Details'],
    ['X', 'Play'],
    ['Y', 'Options'],
    ['LB/RB', 'Filter'],
    ['View', 'Layout'],
    ['Menu', 'Settings'],
    ['LS', 'Fullscreen'],
    ['RS', 'Shelf only']
  ],
  drawer: [
    ['D-pad', 'Move'],
    ['A', 'Select'],
    ['X', 'Play'],
    ['B', 'Close']
  ],
  menu: [
    ['D-pad', 'Move'],
    ['A', 'Choose'],
    ['B', 'Close']
  ],
  dialog: [
    ['D-pad', 'Move'],
    ['A', 'Select'],
    ['B', 'Cancel']
  ],
  settings: [
    ['D-pad', 'Move'],
    ['A', 'Select'],
    ['B', 'Back'],
    ['Menu', 'Close']
  ]
}

export function ButtonGlyph({ glyph }: { glyph: Glyph }): JSX.Element {
  if (glyph === 'A' || glyph === 'B' || glyph === 'X' || glyph === 'Y') {
    return <span className={`pad-glyph face face-${glyph.toLowerCase()}`}>{glyph}</span>
  }
  if (glyph === 'View')
    return (
      <span className="pad-glyph round" aria-label="View">
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
          <rect x="1.5" y="2.5" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="5.5" y="6.5" width="9" height="7" rx="1.5" fill="currentColor" />
        </svg>
      </span>
    )
  if (glyph === 'Menu')
    return (
      <span className="pad-glyph round" aria-label="Menu">
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
          <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    )
  if (glyph === 'D-pad')
    return (
      <span className="pad-glyph round" aria-label="D-pad">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
          <path d="M6 1.5h4v4.5h4.5v4H10v4.5H6V10H1.5V6H6z" fill="currentColor" />
        </svg>
      </span>
    )
  return <span className="pad-glyph pill">{glyph}</span>
}

/** Bar at the bottom of the window listing what each controller button does right now. */
export function ControllerHints(): JSX.Element {
  const connected = useLibrary((s) => s.controller.connected)
  const context = useLibrary((s) => s.controller.context)
  const enabled = useLibrary((s) => s.settings.controller && s.settings.controllerHints)
  const visible = connected && enabled

  useEffect(() => {
    document.body.classList.toggle('has-pad-hints', visible)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pad-hints"
          aria-label="Controller buttons"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {HINTS[context].map(([glyph, label]) => (
              <motion.span
                key={`${context}-${glyph}`}
                className="pad-hint"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <ButtonGlyph glyph={glyph} />
                {label}
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
