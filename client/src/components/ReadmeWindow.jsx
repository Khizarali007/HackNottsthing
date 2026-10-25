import { useEffect, useRef } from 'react'

// A Notepad-style window showing the readme as plain text.
// With no readme (or while it loads) the page is blank, like a new document.
export default function ReadmeWindow({ phase, readme, onClose }) {
  const windowRef = useRef(null)

  // Focus the window so Escape closes it right away.
  useEffect(() => {
    windowRef.current?.focus()
  }, [])

  const title = `${readme?.name ?? 'Untitled'} - Notepad`

  let text = ''
  if (phase === 'error') text = "Couldn't load the README."
  else if (readme) text = readme.truncated ? `${readme.content}\n\n[The rest of this file is not shown.]` : readme.content

  function onKeyDown(e) {
    if (e.key !== 'Escape') return
    // Keep the app's Escape handler from closing the side panel too.
    e.stopPropagation()
    onClose()
  }

  return (
    <div
      ref={windowRef}
      className="xp-window xp-readme-window"
      role="dialog"
      aria-labelledby="xp-readme-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="xp-titlebar">
        <span className="xp-title" id="xp-readme-title">{title}</span>
        <div className="xp-controls">
          <span className="xp-btn xp-btn--min" aria-hidden="true" />
          <span className="xp-btn xp-btn--max" aria-hidden="true" />
          <button type="button" className="xp-btn xp-btn--close" onClick={onClose} aria-label="Close README" />
        </div>
      </div>

      <div className="xp-menubar xp-readme-menu" aria-hidden="true">
        <span>File</span>
        <span>Edit</span>
        <span>Format</span>
        <span>View</span>
        <span>Help</span>
      </div>

      <div className="xp-readme-body">
        {/* Text only, never HTML, so a readme can't inject anything. */}
        <pre className="xp-readme-text" tabIndex={0}>{text}</pre>
      </div>
    </div>
  )
}
