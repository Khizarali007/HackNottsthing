import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Graph from './components/Graph.jsx'
import SidePanel from './components/SidePanel.jsx'
import SummaryPanel from './components/SummaryPanel.jsx'
import StatusDialog from './components/StatusDialog.jsx'
import TimeLapseSlider from './components/TimeLapseSlider.jsx'
import RepoPicker from './components/RepoPicker.jsx'
import useAiConfig from './hooks/useAiConfig.js'
import useCommitHistory from './hooks/useCommitHistory.js'
import useStartupSound from './hooks/useStartupSound.js'
import useCommitClassifier from './hooks/useCommitClassifier.js'

// Root component that composes the graph, side panel and time-lapse slider.
export default function App() {
  // null = the server's default repo; otherwise a GitHub URL typed into the picker.
  const [repoUrl, setRepoUrl] = useState(null)

  // The hook also returns setCommits for the classifier to write aiCategory back.
  const { commits, status, error, usingSample, total, dropped, retry } = useCommitHistory(repoUrl)
  const { classifyCommits, categories, status: aiStatus } = useCommitClassifier()
  useStartupSound()
  const aiConfig = useAiConfig()
  // Until the server has answered, treat AI as off.
  const aiEnabled = aiConfig.ready && aiConfig.enabled
  const [selectedId, setSelectedId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(Infinity)
  const [followId, setFollowId] = useState(null)
  const [playToken, setPlayToken] = useState(0)
  const handlePlay = useCallback(() => setPlayToken((n) => n + 1), [])

  // Changing repo resets everything that pointed at the old graph.
  function handleRepoSubmit(url) {
    setRepoUrl(url || null) // empty box = back to the default repo
    setSelectedId(null)
    setVisibleCount(Infinity)
    setFollowId(null)
  }

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

  // Merge the classifier's results into the commits before anything reads them.
  const classifiedCommits = useMemo(
    () => commits.map((c) => ({ ...c, aiCategory: categories[c.id] ?? c.aiCategory })),
    [commits, categories],
  )

  // Looked up by id so the panel picks up aiCategory once it's classified.
  // A commit hidden by the time-lapse closes the panel.
  const selectedCommit = useMemo(
    () => (visibleIds.has(selectedId) ? classifiedCommits.find((c) => c.id === selectedId) : null),
    [classifiedCommits, selectedId, visibleIds],
  )

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (aiStatus === 'ready' && commits.length > 0) {
      classifyCommits(commits)
    }
  }, [aiStatus, commits, classifyCommits])

  // Rendered in every branch below so you can always enter a new repo,
  // including while loading and after an error.
  const picker = (
    <div className="fixed left-1/2 top-2 z-20 -translate-x-1/2">
      <RepoPicker value={repoUrl ?? ''} onSubmit={handleRepoSubmit} />
    </div>
  )

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen xp-desktop">
        {picker}
        <StatusDialog title="GitStory" icon="loading">
          Reading git history…
        </StatusDialog>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="h-screen w-screen xp-desktop">
        {picker}
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
        {picker}
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
        {picker}
        <main className="relative min-w-0 flex-1">
          <Graph
            commits={classifiedCommits}
            selectedId={selectedId}
            onSelect={setSelectedId}
            visibleIds={visibleIds}
            followId={followId}
            playToken={playToken}
          />
          {(usingSample || dropped > 0) && (
            <div className="xp-balloon" role="status">
              {usingSample && <div>Backend offline - showing sample data.</div>}
              {dropped > 0 && (
                <div>Showing the latest {commits.length} of {total} commits.</div>
              )}
            </div>
          )}
        </main>

        {/* Side panel slot */}
        {selectedCommit && (
          <aside className="flex h-full w-80 shrink-0 flex-col gap-3 p-3 pb-13">
            <SidePanel commit={selectedCommit} onClose={() => setSelectedId(null)} />
            <SummaryPanel key={selectedCommit.id} commit={selectedCommit} aiEnabled={aiEnabled} />
          </aside>
        )}

        {/* Time-lapse slider slot, docked like the XP taskbar */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <TimeLapseSlider
            count={sortedCommits.length}
            value={shownCount}
            onChange={scrubTo}
            currentDate={sortedCommits[shownCount - 1]?.date}
            onPlay={handlePlay}
          />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
