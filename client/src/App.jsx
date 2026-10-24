import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Graph from './components/Graph.jsx'
import SidePanel from './components/SidePanel.jsx'
import SummaryPanel from './components/SummaryPanel.jsx'
import StatusDialog from './components/StatusDialog.jsx'
import TimeLapseSlider from './components/TimeLapseSlider.jsx'
import useCommitHistory from './hooks/useCommitHistory.js'
import useStartupSound from './hooks/useStartupSound.js'

// Root component that composes the graph, side panel and time-lapse slider.
export default function App() {
  // The hook also returns setCommits for the classifier to write aiCategory back.
  const { commits, status, error, usingSample, retry } = useCommitHistory()
  useStartupSound()
  const [selectedId, setSelectedId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(Infinity)
  const [followId, setFollowId] = useState(null)

  // Oldest first. git log lists newest first, so equal dates keep the
  // later array index (older commit) first.
  const sortedCommits = useMemo(
    () =>
      commits
        .map((commit, index) => ({ commit, index }))
        .sort((a, b) => Date.parse(a.commit.date) - Date.parse(b.commit.date) || b.index - a.index)
        .map(({ commit }) => commit),
    [commits],
  )

  const shownCount = Math.min(visibleCount, sortedCommits.length)
  const visibleIds = useMemo(
    () => new Set(sortedCommits.slice(0, shownCount).map((c) => c.id)),
    [sortedCommits, shownCount],
  )

  const scrubTo = useCallback(
    (count) => {
      setVisibleCount(count)
      setFollowId(sortedCommits[count - 1]?.id ?? null)
    },
    [sortedCommits],
  )

  // Looked up by id so the panel picks up aiCategory once it's classified.
  // A commit hidden by the time-lapse closes the panel.
  const selectedCommit = useMemo(
    () => (visibleIds.has(selectedId) ? commits.find((c) => c.id === selectedId) : null),
    [commits, selectedId, visibleIds],
  )

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen xp-desktop">
        <StatusDialog title="GitStory" icon="loading">
          Reading git history…
        </StatusDialog>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="h-screen w-screen xp-desktop">
        <StatusDialog
          title="GitStory - Error"
          icon="error"
          action={<button type="button" className="xp-button" onClick={retry}>Retry</button>}
        >
          <p>Couldn't load the commit history.</p>
          <p className="xp-dialog-detail">{error}</p>
        </StatusDialog>
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="h-screen w-screen xp-desktop">
        <StatusDialog
          title="GitStory"
          icon="info"
          action={<button type="button" className="xp-button" onClick={retry}>Refresh</button>}
        >
          <p>No commits found.</p>
          <p className="xp-dialog-detail">
            Start the server inside a git repository that has at least one commit.
          </p>
        </StatusDialog>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="relative flex h-screen w-screen overflow-hidden xp-desktop">
        <main className="relative min-w-0 flex-1">
          <Graph
            commits={commits}
            selectedId={selectedId}
            onSelect={setSelectedId}
            visibleIds={visibleIds}
            followId={followId}
          />
          {usingSample && (
            <div className="xp-balloon" role="status">
              Backend offline - showing sample data.
            </div>
          )}
        </main>

        {/* Side panel slot (Agent 3) */}
        {selectedCommit && (
          <aside className="flex h-full w-80 shrink-0 flex-col gap-3 p-3 pb-13">
            <SidePanel commit={selectedCommit} onClose={() => setSelectedId(null)} />
            {/* Summary isn't built yet; pass the real text as `summary` once it is. */}
            <SummaryPanel key={selectedCommit.id} commit={selectedCommit} summary={null} />
          </aside>
        )}

        {/* Time-lapse slider slot (Agent 3), docked like the XP taskbar */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <TimeLapseSlider
            count={sortedCommits.length}
            value={shownCount}
            onChange={scrubTo}
            currentDate={sortedCommits[shownCount - 1]?.date}
          />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
