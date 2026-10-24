import { useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CommitNode from './CommitNode.jsx'
import Legend from './Legend.jsx'
import { commitsToGraph, layoutGraph, nodeSize } from '../lib/layout.js'
import { categoryStyle } from '../lib/categories.js'

// Zoom where commit windows are readable.
const READABLE_ZOOM = 0.6
// Small histories still open fully zoomed out; bigger ones start on the newest commit.
const FIT_MAX_COMMITS = 12
// Starting Play below this zoom bumps it up to READABLE_ZOOM once.
const MIN_PLAY_ZOOM = 0.45
const FIT_OPTIONS = { padding: 0.1 }
const PAN_MS = 300

// Defined at module scope so React Flow doesn't see a new object each render.
const nodeTypes = { commit: CommitNode }

function nodeCenter(node) {
  return [node.position.x + node.width / 2, node.position.y + node.height / 2]
}

// Latest by date; on a tie the first one wins, which is newest in git order.
function newestNode(nodes) {
  let best = null
  let bestTime = -Infinity
  for (const node of nodes) {
    const time = Date.parse(node.data.commit.date)
    if (best === null || time > bestTime) {
      best = node
      bestTime = Number.isNaN(time) ? -Infinity : time
    }
  }
  return best
}

// Everything the layout depends on. Changes to other fields (like aiCategory)
// keep the same signature, so they don't move anything.
function layoutSignature(commits) {
  return commits
    .map((c) => {
      const { width, height } = nodeSize(c)
      return `${c.id}<${c.parents.join(',')}@${width}x${height}`
    })
    .join('|')
}

// Renders the commit history as a React Flow graph laid out with dagre.
// Needs a ReactFlowProvider above it for useReactFlow.
// `playToken` goes up each time Play is pressed.
export default function Graph({ commits, selectedId, onSelect, visibleIds, followId, playToken = 0 }) {
  const { setCenter, getZoom, fitView, zoomTo } = useReactFlow()
  const [flowReady, setFlowReady] = useState(false)
  // The layout the camera was last placed for, so it only happens once per dataset.
  const placedLayoutRef = useRef(null)
  // While the Play zoom-in animates, getZoom() is still in between, so the
  // follow camera uses READABLE_ZOOM until this time.
  const playZoomUntilRef = useRef(0)
  const latestRef = useRef({ followId: null, layout: null })

  const signature = useMemo(() => layoutSignature(commits), [commits])

  // Layout runs on every commit, so the time-lapse only toggles visibility
  // and nothing moves. Keyed on the signature on purpose: `commits` is read
  // here but only its structure matters.
  const layout = useMemo(() => {
    const graph = commitsToGraph(commits)
    if (import.meta.env.DEV) {
      console.log(`[graph] layout: ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
    }
    return { nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // Latest commit data, selection and visibility go on top of the fixed positions.
  const displayNodes = useMemo(() => {
    const byId = new Map(commits.map((c) => [c.id, c]))
    return layout.nodes.map((node) => {
      const commit = byId.get(node.id) ?? node.data.commit
      return {
        ...node,
        data: { commit },
        selected: node.id === selectedId,
        hidden: !visibleIds.has(node.id),
      }
    })
  }, [layout, commits, selectedId, visibleIds])

  const displayEdges = useMemo(
    () =>
      layout.edges.map((edge) => {
        const active = edge.source === selectedId || edge.target === selectedId
        return {
          ...edge,
          hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
          className: active ? 'xp-edge--active' : undefined,
          animated: active,
          // Draw highlighted edges above the rest.
          zIndex: active ? 1 : 0,
        }
      }),
    [layout, visibleIds, selectedId],
  )

  // First view of a dataset: small histories fit on screen, bigger ones open
  // on the newest commit at a readable zoom. Selection and category updates
  // keep the same layout object, so they never move the camera here.
  useEffect(() => {
    if (!flowReady || placedLayoutRef.current === layout) return
    placedLayoutRef.current = layout

    if (layout.nodes.length <= FIT_MAX_COMMITS) {
      fitView(FIT_OPTIONS)
      return
    }
    const node = newestNode(layout.nodes)
    if (node) setCenter(...nodeCenter(node), { zoom: READABLE_ZOOM })
  }, [flowReady, layout, fitView, setCenter])

  // Read by the Play effect without making it re-run on every step.
  useEffect(() => {
    latestRef.current = { followId, layout }
  })

  // Pan to the newest revealed commit while scrubbing, at the user's zoom.
  // Depends on the layout, not the commit data, so a category update doesn't
  // move the camera.
  useEffect(() => {
    const node = layout.nodes.find((n) => n.id === followId)
    if (!node) return
    const zoom = performance.now() < playZoomUntilRef.current ? READABLE_ZOOM : getZoom()
    setCenter(...nodeCenter(node), { zoom, duration: PAN_MS })
  }, [followId, layout, setCenter, getZoom])

  // Pressing Play when zoomed far out bumps the zoom up once. After that the
  // follow camera keeps whatever zoom the user picks.
  useEffect(() => {
    if (!playToken || !flowReady || getZoom() >= MIN_PLAY_ZOOM) return
    playZoomUntilRef.current = performance.now() + PAN_MS + 100

    const { followId: id, layout: current } = latestRef.current
    const node = current?.nodes.find((n) => n.id === id)
    if (node) setCenter(...nodeCenter(node), { zoom: READABLE_ZOOM, duration: PAN_MS })
    else zoomTo(READABLE_ZOOM, { duration: PAN_MS })
  }, [playToken, flowReady, getZoom, setCenter, zoomTo])

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onInit={() => setFlowReady(true)}
        onlyRenderVisibleElements
        // Used by the Controls fit view button.
        fitViewOptions={FIT_OPTIONS}
        minZoom={0.05}
      >
        <Panel position="top-left">
          <Legend />
        </Panel>
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) =>
            node.selected ? '#ffd700' : categoryStyle(node.data.commit.aiCategory).color
          }
          maskColor="rgb(0 0 0 / 0.15)"
        />
      </ReactFlow>
    </div>
  )
}
