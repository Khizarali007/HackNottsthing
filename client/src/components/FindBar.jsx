import { useEffect, useRef } from 'react'

// XP-style find box for the graph, like the browser's Ctrl+F.
// index is the current match (0-based, -1 for none), total the match count.
export default function FindBar({ query, onQueryChange, index, total, onNext, onPrev }) {
  const inputRef = useRef(null)
  const active = query.trim() !== ''

  // Ctrl+F / Cmd+F opens our box instead of the browser's find bar.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'f') return
      const input = inputRef.current
      // Leave the browser's find alone while the app is covered (start-up screen).
      if (!input || input.closest('[inert]')) return
      e.preventDefault()
      input.focus({ preventScroll: true })
      input.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) onPrev()
      else onNext()
    } else if (e.key === 'Escape') {
      // Keep the app's Escape handler from closing the side panel too.
      e.stopPropagation()
      onQueryChange('')
      e.currentTarget.blur()
    }
  }

  let counter = null
  if (active) counter = total === 0 ? 'No matches' : `${index + 1} of ${total}`

  return (
    <div className="xp-find nokey" role="search">
      <label className="xp-find-label" htmlFor="xp-find-input">Find:</label>
      <input
        id="xp-find-input"
        ref={inputRef}
        className="xp-find-input"
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        aria-label="Find in commits"
        autoComplete="off"
        spellCheck={false}
      />
      <span
        className={`xp-find-count${active && total === 0 ? ' xp-find-count--none' : ''}`}
        role="status"
        aria-live="polite"
      >
        {counter}
      </span>
      <button type="button" className="xp-button xp-find-button" onClick={onPrev} disabled={total === 0} aria-label="Previous match">
        Prev
      </button>
      <button type="button" className="xp-button xp-find-button" onClick={onNext} disabled={total === 0} aria-label="Next match">
        Next
      </button>
      <button
        type="button"
        className="xp-btn xp-btn--close xp-find-clear"
        onClick={() => onQueryChange('')}
        disabled={!query}
        aria-label="Clear search"
        title="Clear search"
      />
    </div>
  )
}
