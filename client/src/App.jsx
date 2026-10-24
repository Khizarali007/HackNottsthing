import { useMemo, useState } from 'react'
import Graph from './components/Graph.jsx'
import SidePanel from './components/SidePanel.jsx'
import TimeLapseSlider from './components/TimeLapseSlider.jsx'
import mockData from './data/mockData.json'

// Root component that composes the graph, side panel and time-lapse slider.
export default function App() {
  // Swapped for a fetch to /api/history once the backend is ready.
  const [commits, setCommits] = useState(mockData)
  const [selectedId, setSelectedId] = useState(null)
  // Looked up by id so the panel picks up aiCategory once it's classified.
  const selectedCommit = useMemo(
    () => commits.find((c) => c.id === selectedId) ?? null,
    [commits, selectedId],
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden xp-desktop">
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <Graph
            commits={commits}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        {/* Time-lapse slider slot (Agent 3) */}
        <div className="shrink-0">
          <TimeLapseSlider commits={commits} />
        </div>
      </main>

      {/* Side panel slot (Agent 3) */}
      <aside className="h-full shrink-0">
        <SidePanel
          commit={selectedCommit}
          onClose={() => setSelectedId(null)}
        />
      </aside>
    </div>
  )
}
