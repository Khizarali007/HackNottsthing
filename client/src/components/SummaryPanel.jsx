import { useEffect, useRef, useState } from 'react'
import { fetchSummary } from '../lib/aiApi.js'
import { basicSummary } from '../lib/basicSummary.js'

const LOADING_SOUND = '/sounds/loading.mp3'
// Part of the 2000s feel: the loader and sound always run at least this long.
const MIN_LOADING_MS = 21000

const CAPTIONS = {
  // No caption for a real summary, only for the fallbacks.
  ai: null,
  off: 'Basic summary - AI is switched off',
  failed: 'AI unavailable - showing basic summary',
}

// Resolves after `ms`, or rejects straight away if the signal aborts.
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// Plain-English summary of the selected commit, from the server when AI is
// on, otherwise built from the commit's own fields.
// App remounts this per commit (key), so state resets on a new selection.
export default function SummaryPanel({ commit, aiEnabled = false }) {
  // 'idle' | 'loading' | 'done' | 'error'
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const audioRef = useRef(null)
  const requestRef = useRef(null)

  function stopSound() {
    audioRef.current?.pause()
    audioRef.current = null
  }

  // Cancel the request and the sound if the panel goes away mid-load.
  useEffect(
    () => () => {
      requestRef.current?.abort()
      stopSound()
    },
    [],
  )

  function generate() {
    // Started inside the click handler: browsers only allow audio that begins
    // directly from a user gesture.
    const audio = new Audio(LOADING_SOUND)
    audio.loop = true
    audio.play().catch((err) => console.warn('[summary] loading sound blocked:', err))
    audioRef.current = audio

    const controller = new AbortController()
    requestRef.current = controller
    setPhase('loading')

    // The request runs during the wait, so a real summary is usually ready
    // by the time the 21 seconds are up. With AI off the server isn't called.
    const request = aiEnabled
      ? fetchSummary(commit.id, controller.signal).then(
          (text) => ({ text, caption: CAPTIONS.ai }),
          (err) => ({ text: basicSummary(commit), caption: CAPTIONS.failed, reason: err?.message, failed: true }),
        )
      : Promise.resolve({ text: basicSummary(commit), caption: CAPTIONS.off })

    Promise.all([request, wait(MIN_LOADING_MS, controller.signal)])
      .then(([next]) => {
        if (controller.signal.aborted) return
        setResult(next)
        setPhase(next.failed ? 'error' : 'done')
      })
      .catch(() => {
        // Aborted because the panel closed or another commit was picked.
      })
      .finally(() => {
        if (requestRef.current === controller) requestRef.current = null
        stopSound()
      })
  }

  if (!commit) return null

  let body
  if (phase === 'idle') {
    body = (
      <button type="button" className="xp-button" onClick={generate}>
        Generate summary
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
  } else {
    body = (
      <>
        <p className="xp-summary-text">{result.text}</p>
        {result.caption && (
          <p className="xp-summary-caption" title={result.reason}>
            {result.caption}
          </p>
        )}
      </>
    )
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
