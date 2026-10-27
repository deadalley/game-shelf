import { useMemo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { SERVICE_LABELS } from '@shared/types'
import { useLibrary } from '../../state/useLibrary'
import { CoverArt } from '../Cover'

export function HiddenGamesSection(): JSX.Element {
  const games = useLibrary((s) => s.library.games)
  const hidden = useMemo(() => games.filter((g) => g.hidden), [games])
  const setLibrary = useLibrary((s) => s.setLibrary)
  const toggleHidden = useLibrary((s) => s.toggleHidden)

  const showAll = async (): Promise<void> => {
    let lib = null
    for (const g of hidden) lib = await window.gameshelf.updateGame(g.id, { hidden: false })
    if (lib) setLibrary(lib)
  }

  if (hidden.length === 0) {
    return (
      <div className="settings-card empty-card">
        <EyeOff size={20} />
        <div>
          No hidden games. Hover a cover and click the eye icon, or right-click it, to hide a game you don't want on
          your shelf.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="section-actions">
        <span className="section-intro">
          {hidden.length} hidden {hidden.length === 1 ? 'game' : 'games'}. They stay in your library but aren't shown on
          the shelf.
        </span>
        <button className="btn" onClick={() => void showAll()}>
          <Eye size={15} /> Show all
        </button>
      </div>
      <div className="settings-card">
        {hidden
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((g) => (
            <div className="hidden-row" key={g.id} style={{ '--card-w': '36px' } as React.CSSProperties}>
              <div className="mini-cover">
                <CoverArt game={g} />
              </div>
              <div className="setting-text">
                <div className="setting-title">{g.name}</div>
                <div className="setting-desc">{SERVICE_LABELS[g.service]}</div>
              </div>
              <button className="btn" onClick={() => void toggleHidden(g)}>
                <Eye size={15} /> Show
              </button>
            </div>
          ))}
      </div>
    </>
  )
}
