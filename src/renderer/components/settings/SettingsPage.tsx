import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, EyeOff, Gamepad2, Image, Info, LayoutGrid, Library, Palette, ScanSearch } from 'lucide-react'
import { useLibrary } from '../../state/useLibrary'
import { AppearanceSection } from './AppearanceSection'
import { HiddenGamesSection } from './HiddenGamesSection'
import { LibrariesSection } from './LibrariesSection'
import { AboutSection, ControllerSection, CoversSection, ScanSection, ViewSection } from './OtherSections'

const SECTIONS = [
  { id: 'libraries', label: 'Libraries', icon: Library, Component: LibrariesSection },
  { id: 'appearance', label: 'Appearance', icon: Palette, Component: AppearanceSection },
  { id: 'view', label: 'Library view', icon: LayoutGrid, Component: ViewSection },
  { id: 'covers', label: 'Covers', icon: Image, Component: CoversSection },
  { id: 'hidden', label: 'Hidden games', icon: EyeOff, Component: HiddenGamesSection },
  { id: 'controller', label: 'Controller', icon: Gamepad2, Component: ControllerSection },
  { id: 'scan', label: 'Scan', icon: ScanSearch, Component: ScanSection },
  { id: 'about', label: 'About', icon: Info, Component: AboutSection }
]

/** Full-height settings view that slides over the shelf. One scrolling page with a section nav. */
export function SettingsPage(): JSX.Element {
  const setSettingsOpen = useLibrary((s) => s.setSettingsOpen)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = useLibrary.getState()
      if (e.key === 'Escape' && !s.editingId && !s.addOpen && !s.selectedId) setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSettingsOpen])

  // Highlight the section currently at the top of the scroll area.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id.replace('settings-', ''))
      },
      { root, rootMargin: '0px 0px -70% 0px' }
    )
    root.querySelectorAll('section[id^="settings-"]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const jump = (id: string): void => {
    scrollRef.current?.querySelector(`#settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.div
      className="settings-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
    >
      <nav className="settings-nav">
        <button className="btn ghost back" onClick={() => setSettingsOpen(false)}>
          <ArrowLeft size={16} /> Back to shelf
        </button>
        <h1>Settings</h1>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item${active === id ? ' active' : ''}`} onClick={() => jump(id)}>
            {active === id && <motion.span layoutId="settings-nav-bg" className="nav-bg" />}
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="settings-scroll" ref={scrollRef}>
        <div className="settings-content">
          {SECTIONS.map(({ id, label, Component }) => (
            <section key={id} id={`settings-${id}`} className="settings-section">
              <h2>{label}</h2>
              <Component />
            </section>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function SettingRow({
  title,
  description,
  children,
  onClick
}: {
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  onClick?(): void
}): JSX.Element {
  return (
    <div className={`setting-row${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className="setting-text">
        <div className="setting-title">{title}</div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      {children && <div className="setting-control">{children}</div>}
    </div>
  )
}

export function Switch({
  on,
  onChange,
  label
}: {
  on: boolean
  onChange(v: boolean): void
  label: string
}): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!on)
      }}
    />
  )
}
