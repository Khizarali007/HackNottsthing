import dagre from '@dagrejs/dagre'

export const MIN_WIDTH = 180
const MAX_WIDTH = 560
const ASPECT = 0.5
// Text inside a node grows with its width (dampened), see CommitNode.
export function textScale(width) {
  return Math.sqrt(width / MIN_WIDTH)
}
// Height the contents need: borders and padding (fixed) plus the title bar,
// author row, two message lines and the stats row, which all scale with the text.
const CONTENT_FIXED_PX = 40
const CONTENT_PER_SCALE_PX = 80
// Lines changed at which a node reaches MAX_WIDTH. Most commits are under a
// few hundred lines, so a lower cap spreads them out; anything bigger
// (lockfiles, mass refactors) just pins at the max.
export const MAX_IMPACT = 2000

// Impact radius: square-root scale of lines changed, clamped to [min, max].
// Used for both layout and rendering so dagre spaces nodes by their real size.
export function nodeSize(commit) {
  const impact = commit.linesAdded + commit.linesDeleted
  const t = Math.min(Math.sqrt(impact / MAX_IMPACT), 1)
  const width = Math.round(MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * t)
  // Small windows are too short for their text at the plain aspect ratio.
  const minHeight = Math.ceil(CONTENT_FIXED_PX + CONTENT_PER_SCALE_PX * textScale(width))
  return { width, height: Math.max(Math.round(width * ASPECT), minHeight) }
}

// Maps commits to React Flow nodes and parent -> child edges.
// Parents outside the dataset (e.g. shallow clones) are skipped.
export function commitsToGraph(commits) {
  const ids = new Set(commits.map((c) => c.id))

  const nodes = commits.map((commit) => ({
    id: commit.id,
    type: 'commit',
    data: { commit, label: commit.message },
    position: { x: 0, y: 0 },
    sourcePosition: 'right',
    targetPosition: 'left',
    ...nodeSize(commit),
  }))

  const edges = commits.flatMap((commit) =>
    commit.parents
      .filter((parent) => ids.has(parent))
      .map((parent) => ({
        id: `${parent}->${commit.id}`,
        source: parent,
        target: commit.id,
      })),
  )

  return { nodes, edges }
}

// Positions nodes left-to-right with dagre. Dagre returns centre points,
// React Flow expects top-left corners.
export function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width, height: node.height })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const { x, y } = g.node(node.id)
    return {
      ...node,
      position: { x: x - node.width / 2, y: y - node.height / 2 },
    }
  })
}
