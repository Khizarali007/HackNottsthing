import { useMemo } from 'react'
import { ReactFlow, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CommitNode from './CommitNode.jsx'
import { commitsToGraph, layoutGraph } from '../lib/layout.js'

// Defined at module scope so React Flow doesn't see a new object each render.
const nodeTypes = { commit: CommitNode }

// Renders the commit history as a React Flow graph laid out with dagre.
export default function Graph({ commits, selectedId, onSelect }) {
  // Layout runs once per dataset, not per render.
  const { nodes, edges } = useMemo(() => {
    const graph = commitsToGraph(commits)
    if (import.meta.env.DEV) {
      console.log(`[graph] ${commits.length} commits -> ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
    }
    return { nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges }
  }, [commits])

  // Selection is applied separately so clicking doesn't re-run the layout.
  const displayNodes = useMemo(
    () => nodes.map((node) => ({ ...node, selected: node.id === selectedId })),
    [nodes, selectedId],
  )

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
      >
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => (node.selected ? '#ffd700' : '#0053ee')}
          maskColor="rgb(0 0 0 / 0.15)"
        />
      </ReactFlow>
    </div>
  )
}
