// Plain-English AI summary of what the selected commit does.
// `summary` is null until the summary feature exists or has finished.
export default function SummaryPanel({ commit, summary, loading }) {
  if (!commit) return null

  let body
  if (loading) body = <p className="xp-summary-placeholder">Reading commit history…</p>
  else if (summary) body = <p className="xp-summary-text">{summary}</p>
  else body = <p className="xp-summary-placeholder">No AI summary yet for this commit.</p>

  return (
    <div className="xp-window xp-panel">
      <div className="xp-titlebar">
        <span className="xp-title">Summary</span>
      </div>
      <div className="xp-body xp-panel-body">{body}</div>
    </div>
  )
}
