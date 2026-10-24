import { useState } from 'react'
import Graph from './components/Graph.jsx'
import SidePanel from './components/SidePanel.jsx'
import TimeLapseSlider from './components/TimeLapseSlider.jsx'
import mockData from './data/mockData.json'

// Root component that composes the graph, side panel and time-lapse slider.
export default function App() {
  // Swapped for a fetch to /api/history once the backend is ready.
  const [commits, setCommits] = useState(mockData)
  const [selectedCommit, setSelectedCommit] = useState(null)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <Graph commits={commits} onNodeClick={setSelectedCommit} />
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
          onClose={() => setSelectedCommit(null)}
        />
      </aside>
    </div>
  )
}
