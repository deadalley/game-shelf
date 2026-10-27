import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width
}: {
  open: boolean
  title: string
  onClose(): void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}): JSX.Element {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="dialog-layer">
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={width ? { width: `min(${width}px, 100%)` } : undefined}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="dialog-head">
              <h3>{title}</h3>
              <button className="btn ghost icon" onClick={onClose} aria-label="Close">
                <X size={17} />
              </button>
            </div>
            <div className="dialog-body">{children}</div>
            {footer && <div className="dialog-foot">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
