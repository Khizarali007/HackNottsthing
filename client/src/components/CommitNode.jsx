import { Handle, Position } from '@xyflow/react'
import { MIN_WIDTH } from '../lib/layout.js'

// A single commit drawn as a Windows XP window, sized by impact radius.
// Width and height come from nodeSize() via React Flow.
export default function CommitNode({ data, selected, width }) {
  const { commit } = data
  // Text grows with the window so big commits read as big, not just empty.
  const scale = (width ?? MIN_WIDTH) / MIN_WIDTH

  return (
    <div
      className={`xp-window ${selected ? 'xp-window--active' : ''}`}
      style={{ '--xp-scale': scale }}
    >
      <Handle type="target" position={Position.Left} className="xp-handle" />

      <div className="xp-titlebar">
        <span className="xp-title">{commit.id}</span>
        <div className="xp-controls">
          <span className="xp-btn xp-btn--min" />
          <span className="xp-btn xp-btn--max" />
          <span className="xp-btn xp-btn--close" />
        </div>
      </div>

      <div className="xp-menubar">
        <span>{commit.author}</span>
      </div>

      <div className="xp-body">
        <p className="xp-message" title={commit.message}>{commit.message}</p>
        <p className="xp-stats">
          <span className="xp-added">+{commit.linesAdded}</span>{' '}
          <span className="xp-deleted">-{commit.linesDeleted}</span>
        </p>
      </div>

      <Handle type="source" position={Position.Right} className="xp-handle" />
    </div>
  )
}
