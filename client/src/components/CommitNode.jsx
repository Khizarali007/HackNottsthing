import { useState } from 'react'
import { Handle, NodeToolbar, Position } from '@xyflow/react'
import { MIN_WIDTH } from '../lib/layout.js'
import { categoryStyle } from '../lib/categories.js'
import { shortId } from '../lib/format.js'

// A single commit drawn as a Windows XP window, sized by impact radius.
// Width and height come from nodeSize() via React Flow.
export default function CommitNode({ data, selected, width }) {
  const { commit } = data
  const [hovered, setHovered] = useState(false)
  // Text grows with the window (dampened) so big commits read as big, not empty.
  const scale = Math.sqrt((width ?? MIN_WIDTH) / MIN_WIDTH)
  const message = commit.message?.trim() || '(no message)'

  return (
    <>
      {/* Rendered outside the zoomed canvas, so it stays readable at any zoom. */}
      <NodeToolbar isVisible={hovered} position={Position.Top} offset={8}>
        <div className="xp-tooltip">
          <span className="xp-tooltip-hash">{shortId(commit.id)}</span>
          {message}
        </div>
      </NodeToolbar>

      <div
        className={`xp-window xp-node ${selected ? 'xp-window--active' : ''}`}
        style={{
          '--xp-scale': scale,
          '--xp-title-filter': categoryStyle(commit.aiCategory).filter,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Handle type="target" position={Position.Left} className="xp-handle" />

        <div className="xp-titlebar">
          <span className="xp-title" title={commit.id}>{shortId(commit.id)}</span>
          <div className="xp-controls">
            <span className="xp-btn xp-btn--min" />
            <span className="xp-btn xp-btn--max" />
            <span className="xp-btn xp-btn--close" />
          </div>
        </div>

        <div className="xp-menubar">
          <span>{commit.author || 'Unknown author'}</span>
        </div>

        <div className="xp-body">
          <p className="xp-message">{message}</p>
          <p className="xp-stats">
            <span className="xp-added">+{commit.linesAdded}</span>{' '}
            <span className="xp-deleted">-{commit.linesDeleted}</span>
          </p>
        </div>

        <Handle type="source" position={Position.Right} className="xp-handle" />
      </div>
    </>
  )
}
