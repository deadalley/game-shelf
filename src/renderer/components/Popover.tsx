import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

export function Popover({
  trigger,
  children,
  width
}: {
  trigger: (open: boolean, toggle: () => void) => React.ReactNode
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  width?: number
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    // Capture phase: Esc closes just this menu, not the details panel or settings underneath.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const close = (): void => setOpen(false)
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      <AnimatePresence>
        {open && (
          <motion.div
            className="popover"
            style={width ? { width } : undefined}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MenuItem({
  active,
  icon,
  children,
  onClick
}: {
  active?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
  onClick(): void
}): JSX.Element {
  return (
    <button className={`menu-item${active ? ' active' : ''}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
      <Check size={15} className="check" />
    </button>
  )
}

export function SwitchRow({
  label,
  on,
  onChange
}: {
  label: string
  on: boolean
  onChange(v: boolean): void
}): JSX.Element {
  return (
    <div
      className="switch-row"
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!on)}
    >
      <span>{label}</span>
      <span className={`switch${on ? ' on' : ''}`} />
    </div>
  )
}
