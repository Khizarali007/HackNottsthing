import { useEffect, useRef, useState } from 'react'

const LOADING_MS = 21000
const LOADING_SOUND = '/sounds/loading.mp3'

// Plain-English summary of what the selected commit does.
// `summary` is null until the summary feature exists.
// App remounts this per commit (key), so state resets on a new selection.
export default function SummaryPanel({ commit, summary }) {
  // 'idle' | 'loading' | 'done'
  const [phase, setPhase] = useState('idle')
  const audioRef = useRef(null)

  // Started inside the click handler: browsers only allow audio that begins
  // directly from a user gesture, and block it if started later in an effect.
  function startLoading() {
    const audio = new Audio(LOADING_SOUND)
    audio.loop = true
    audio.play().catch((err) => console.warn('[summary] loading sound blocked:', err))
    audioRef.current = audio
    setPhase('loading')
  }

  // Stop the sound and timer when loading ends, or if the panel closes or
  // the commit changes mid-load.
  useEffect(() => {
    if (phase !== 'loading') return
    const timer = setTimeout(() => setPhase('done'), LOADING_MS)
    return () => {
      clearTimeout(timer)
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [phase])

  if (!commit) return null

  let body
  if (phase === 'idle') {
    body = (
      <button type="button" className="xp-button" onClick={startLoading}>
        Get summary
      </button>
    )
  } else if (phase === 'loading') {
    body = (
      <div className="xp-summary-loading" role="status">
        <span className="xp-throbber" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} style={{ '--i': i }} />
          ))}
        </span>
        Reading commit history…
      </div>
    )
  } else if (summary) {
    body = <p className="xp-summary-text">{summary}</p>
  } else {
    body = <p className="xp-summary-placeholder">No summary available for this commit yet.</p>
  }

  return (
    <div className="xp-window xp-panel">
      <div className="xp-titlebar">
        <span className="xp-title">Summary</span>
      </div>
      <div className="xp-body xp-panel-body">{body}</div>
    </div>
  )
}
