import { categoryStyle } from '../lib/categories.js'
import { shortId } from '../lib/format.js'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()
}

// Badge text while a commit has no category yet.
function pendingLabel(aiStatus) {
  if (aiStatus === 'loading' || aiStatus === 'classifying') return 'Classifying…'
  if (aiStatus === 'error') return 'AI offline'
  return 'Unclassified'
}

// Shows details for the currently selected commit.
// aiStatus: 'idle' | 'loading' | 'classifying' | 'ready' | 'error'
export default function SidePanel({ commit, onClose, aiStatus = 'idle' }) {
  if (!commit) return null

  const category = categoryStyle(commit.aiCategory)

  return (
    <div className="xp-window xp-panel">
      <div className="xp-titlebar">
        <span className="xp-title" title={commit.id}>Commit {shortId(commit.id)}</span>
        <div className="xp-controls">
          <button
            type="button"
            className="xp-btn xp-btn--close"
            aria-label="Close"
            onClick={onClose}
          />
        </div>
      </div>

      <div className="xp-body xp-panel-body">
        <p className="xp-panel-message">{commit.message?.trim() || '(no message)'}</p>

        <dl className="xp-panel-meta">
          <dt>Hash</dt>
          <dd className="xp-panel-parents">{commit.id}</dd>
          <dt>Author</dt>
          <dd>{commit.author || 'Unknown author'}</dd>
          <dt>Date</dt>
          <dd>{formatDate(commit.date)}</dd>
          <dt>Lines</dt>
          <dd className="xp-stats">
            <span className="xp-added">+{commit.linesAdded}</span>{' '}
            <span className="xp-deleted">-{commit.linesDeleted}</span>
          </dd>
          <dt>Category</dt>
          <dd>
            <span className="xp-badge" style={{ background: category.color }}>
              {commit.aiCategory ?? pendingLabel(aiStatus)}
            </span>
          </dd>
          <dt>{commit.parents.length > 1 ? 'Parents (merge)' : 'Parent'}</dt>
          <dd className="xp-panel-parents">
            {commit.parents.length
              ? commit.parents.map((p, i) => (
                  <span key={p} title={p}>
                    {i > 0 && ', '}
                    {shortId(p)}
                  </span>
                ))
              : 'None (root commit)'}
          </dd>
        </dl>
      </div>
    </div>
  )
}
