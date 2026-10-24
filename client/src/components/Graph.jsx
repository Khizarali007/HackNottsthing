import { useEffect, useMemo } from 'react'
import { ReactFlow, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CommitNode from './CommitNode.jsx'
import Legend from './Legend.jsx'
import { commitsToGraph, layoutGraph } from '../lib/layout.js'
import { categoryStyle } from '../lib/categories.js'

// Defined at module scope so React Flow doesn't see a new object each render.
const nodeTypes = { commit: CommitNode }

// Renders the commit history as a React Flow graph laid out with dagre.
// Needs a ReactFlowProvider above it for useReactFlow.
export default function Graph({ commits, selectedId, onSelect, visibleIds, followId }) {
  const { setCenter, getZoom } = useReactFlow()

  // Layout runs once per dataset, on every commit, so the time-lapse
  // only toggles visibility and nothing moves.
  const { nodes, edges } = useMemo(() => {
    const graph = commitsToGraph(commits)
    if (import.meta.env.DEV) {
      console.log(`[graph] ${commits.length} commits -> ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
    }
    return { nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges }
  }, [commits])

  // Selection and visibility are applied separately so neither re-runs the layout.
  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedId,
        hidden: !visibleIds.has(node.id),
      })),
    [nodes, selectedId, visibleIds],
  )

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
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
    [edges, visibleIds, selectedId],
  )

  // Pan to the newest revealed commit while scrubbing.
  useEffect(() => {
    const node = nodes.find((n) => n.id === followId)
    if (!node) return
    setCenter(node.position.x + node.width / 2, node.position.y + node.height / 2, {
      zoom: getZoom(),
      duration: 300,
    })
  }, [followId, nodes, setCenter, getZoom])

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.1 }}
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
