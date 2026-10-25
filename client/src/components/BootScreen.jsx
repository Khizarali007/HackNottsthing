import { useEffect, useRef, useState } from 'react'
import { BLOCK_COUNT, FADE_MS, bootProgress, litBlocks, loadingDoneAtMs } from '../lib/boot.js'
import { playStartupSound } from '../hooks/useStartupSound.js'

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// XP-style start-up: a loading dialog, then the welcome screen, which fades
// out on click to show the app underneath.
// ready: the history request has finished. onDone: called once it has faded out.
// phase: 'loading' | 'welcome' | 'leaving'
export default function BootScreen({ ready, onDone }) {
  const [phase, setPhase] = useState('loading')
  const [percent, setPercent] = useState(0)
  const [lit, setLit] = useState(0)
  const [shaking, setShaking] = useState(false)
  const readyRef = useRef(ready)
  const onDoneRef = useRef(onDone)
  const welcomeRef = useRef(null)
  const activatedRef = useRef(false)

  useEffect(() => {
    readyRef.current = ready
    onDoneRef.current = onDone
  })

  // Drive the progress bar until loading is done.
  useEffect(() => {
    const start = performance.now()
    let readyAt = null
    let frame

    const tick = () => {
      const elapsed = performance.now() - start
      if (readyAt === null && readyRef.current) readyAt = elapsed
      const progress = bootProgress(elapsed, readyAt)
      setPercent(Math.round(progress * 100))
      setLit(litBlocks(progress))
      if (elapsed >= loadingDoneAtMs(readyAt)) {
        setPhase('welcome')
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (phase === 'welcome') welcomeRef.current?.focus({ preventScroll: true })
    if (phase !== 'leaving') return
    if (prefersReducedMotion()) {
      onDoneRef.current()
      return
    }
    const timer = setTimeout(() => onDoneRef.current(), FADE_MS)
    return () => clearTimeout(timer)
  }, [phase])

  const activate = () => {
    if (activatedRef.current) return
    activatedRef.current = true
    // Must happen inside the event handler or the browser blocks it.
    playStartupSound()
    setPhase('leaving')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }

  return (
    <div className={`xp-boot xp-desktop${phase === 'leaving' ? ' xp-boot--leaving' : ''}`}>
      {phase === 'loading' ? (
        <div className="xp-dialog-overlay">
          <div
            className={`xp-window xp-boot-dialog${shaking ? ' xp-boot-shake' : ''}`}
            onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}
          >
            <div className="xp-titlebar">
              <span className="xp-title">Commit Explorer</span>
              <div className="xp-controls" aria-hidden="true">
                <span className="xp-btn xp-btn--close" />
              </div>
            </div>
            <div className="xp-boot-dialog-body">
              <p className="xp-boot-loading-text">Loading Commit Explorer...</p>
              <div className="xp-boot-progress-row">
                <div
                  className="xp-boot-progress"
                  role="progressbar"
                  aria-label="Loading Commit Explorer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  {Array.from({ length: BLOCK_COUNT }, (_, i) => (
                    <span key={i} className={i < lit ? 'xp-boot-block xp-boot-block--lit' : 'xp-boot-block'} />
                  ))}
                </div>
                <button type="button" className="xp-button" onClick={() => setShaking(true)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={welcomeRef}
          className="xp-boot-welcome"
          role="button"
          tabIndex={0}
          aria-label="Welcome. Click to continue."
          onClick={activate}
          onKeyDown={onKeyDown}
        >
          <div className="xp-boot-top" />
          <span className="xp-boot-word">welcome</span>
          <div className="xp-boot-bottom">
            <span className="xp-boot-prompt">Click anywhere to begin</span>
          </div>
        </div>
      )}
    </div>
  )
}
