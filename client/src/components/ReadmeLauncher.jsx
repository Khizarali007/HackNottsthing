import { useEffect, useRef, useState } from 'react'
import { fetchReadme } from '../lib/readmeApi.js'
import ReadmeWindow from './ReadmeWindow.jsx'

// Desktop-style icon that opens the repo's readme in a Notepad-like window.
// The readme is fetched the first time it is opened. App remounts this per
// repo (key), so a new repo starts closed and empty.
export default function ReadmeLauncher({ repoUrl }) {
  const [open, setOpen] = useState(false)
  // 'idle' | 'loading' | 'done' | 'error'
  const [phase, setPhase] = useState('idle')
  const [readme, setReadme] = useState(null)
  const iconRef = useRef(null)
  const requestRef = useRef(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  function load() {
    const controller = new AbortController()
    requestRef.current = controller
    setPhase('loading')
    fetchReadme(repoUrl, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setReadme(data)
        setPhase('done')
      },
      () => {
        if (controller.signal.aborted) return
        setPhase('error')
      },
    )
  }

  function openReadme() {
    setOpen(true)
    // A failed load is tried again the next time it is opened.
    if (phase === 'idle' || phase === 'error') load()
  }

  function close() {
    setOpen(false)
    iconRef.current?.focus()
  }

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        className="xp-desktop-icon"
        onClick={openReadme}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <img src="/icons/open-folder.png" width="48" height="48" alt="" draggable="false" />
        <span>README</span>
      </button>
      {open && <ReadmeWindow phase={phase} readme={readme} onClose={close} />}
    </>
  )
}
