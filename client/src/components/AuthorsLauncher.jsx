import { useMemo, useRef, useState } from 'react'
import { countAuthors } from '../lib/authorStats.js'
import AuthorsWindow from './AuthorsWindow.jsx'

// Desktop-style icon that opens a list of the authors and their commit counts.
// App remounts this per repo (key), so a new repo starts closed.
export default function AuthorsLauncher({ commits, total }) {
  const [open, setOpen] = useState(false)
  const iconRef = useRef(null)
  const authors = useMemo(() => countAuthors(commits), [commits])

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
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <img src="/icons/authors.png" width="48" height="48" alt="" draggable="false" />
        <span>Authors</span>
      </button>
      {open && (
        <AuthorsWindow authors={authors} commitCount={commits.length} totalCount={total} onClose={close} />
      )}
    </>
  )
}
