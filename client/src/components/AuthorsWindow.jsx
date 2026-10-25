import { useEffect, useRef } from 'react'
import { formatShare } from '../lib/authorStats.js'

// A small list view of who made how many commits.
// commitCount is what was loaded; totalCount is how many the repo has, which
// is larger when only the newest commits were loaded.
export default function AuthorsWindow({ authors, commitCount, totalCount, onClose }) {
  const windowRef = useRef(null)

  // Focus the window so Escape closes it right away.
  useEffect(() => {
    windowRef.current?.focus()
  }, [])

  function onKeyDown(e) {
    if (e.key !== 'Escape') return
    // Keep the app's Escape handler from closing the side panel too.
    e.stopPropagation()
    onClose()
  }

  const commits = totalCount > commitCount ? `latest ${commitCount} of ${totalCount} commits` : `${commitCount} ${commitCount === 1 ? 'commit' : 'commits'}`

  return (
    <div
      ref={windowRef}
      className="xp-window xp-authors-window"
      role="dialog"
      aria-labelledby="xp-authors-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="xp-titlebar">
        <span className="xp-title" id="xp-authors-title">Authors</span>
        <div className="xp-controls">
          <span className="xp-btn xp-btn--min" aria-hidden="true" />
          <span className="xp-btn xp-btn--max" aria-hidden="true" />
          <button type="button" className="xp-btn xp-btn--close" onClick={onClose} aria-label="Close Authors" />
        </div>
      </div>

      <div className="xp-authors-body">
        {authors.length === 0 ? (
          <p className="xp-authors-empty">No commits to show.</p>
        ) : (
          <table className="xp-authors-table">
            <thead>
              <tr>
                <th scope="col">Author</th>
                <th scope="col" className="xp-authors-num">Commits</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {authors.map((author) => (
                <tr key={author.name}>
                  <td className="xp-authors-name" title={author.name}>{author.name}</td>
                  <td className="xp-authors-num">{author.commits}</td>
                  <td>
                    <div className="xp-authors-share">
                      <span className="xp-authors-bar" aria-hidden="true">
                        <span style={{ width: `${author.share * 100}%` }} />
                      </span>
                      <span className="xp-authors-percent">{formatShare(author.share)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="xp-authors-status" role="status">
        {authors.length} {authors.length === 1 ? 'author' : 'authors'}, {commits}
      </div>
    </div>
  )
}
