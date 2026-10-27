import { useState } from 'react'
import { ImagePlus, Search } from 'lucide-react'

/**
 * Cover chooser: a local file or a SteamGridDB result.
 * `value` is a cover URL to preview (current cover, a file path or a remote URL).
 */
export function CoverPicker({
  value,
  searchName,
  onChange
}: {
  value: string | undefined
  searchName: string
  onChange(source: string): void
}): JSX.Element {
  const [results, setResults] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview =
    value && !/^(https?|gamecover):/.test(value) ? `gamecover://file/?p=${encodeURIComponent(value)}` : value

  const pick = async (): Promise<void> => {
    const file = await window.gameshelf.pickFile('image')
    if (file) onChange(file)
  }

  const search = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await window.gameshelf.searchCovers(searchName)
    setBusy(false)
    setResults(res.covers)
    if (res.error) setError(res.error)
  }

  return (
    <>
      <div className="cover-edit">
        <div className="preview">{preview ? <img src={preview} alt="" /> : 'No cover'}</div>
        <button className="btn" onClick={() => void pick()}>
          <ImagePlus size={15} /> Choose image
        </button>
        <button className="btn" onClick={() => void search()} disabled={busy || !searchName.trim()}>
          <Search size={15} className={busy ? 'spin' : ''} /> Find online
        </button>
      </div>
      {(results || error) && (
        <div className="cover-results">
          {error && <div className={`notice${results?.length ? '' : ' error'}`}>{error}</div>}
          {results && results.length > 0 && (
            <div className="sgdb-grid">
              {results.map((url) => (
                <button key={url} className={value === url ? 'active' : ''} onClick={() => onChange(url)}>
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
