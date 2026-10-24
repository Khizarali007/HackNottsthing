import { useEffect, useMemo } from 'react'
import { ReactFlow, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CommitNode from './CommitNode.jsx'
import Legend from './Legend.jsx'
import { commitsToGraph, layoutGraph, nodeSize } from '../lib/layout.js'
import { categoryStyle } from '../lib/categories.js'

// Defined at module scope so React Flow doesn't see a new object each render.
const nodeTypes = { commit: CommitNode }

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
export default function Graph({ commits, selectedId, onSelect, visibleIds, followId }) {
  const { setCenter, getZoom } = useReactFlow()

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

  // Pan to the newest revealed commit while scrubbing. Depends on the layout,
  // not the commit data, so a category update doesn't move the camera.
  useEffect(() => {
    const node = layout.nodes.find((n) => n.id === followId)
    if (!node) return
    setCenter(node.position.x + node.width / 2, node.position.y + node.height / 2, {
      zoom: getZoom(),
      duration: 300,
    })
  }, [followId, layout, setCenter, getZoom])

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onlyRenderVisibleElements
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
