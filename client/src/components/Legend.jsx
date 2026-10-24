import { CATEGORIES, UNCLASSIFIED } from '../lib/categories.js'
import { MAX_IMPACT, nodeSize } from '../lib/layout.js'

// Sample sizes shown at a fraction of their real size.
const SIZE_SAMPLES = [0, 100, 500, MAX_IMPACT]
const SIZE_RATIO = 1 / 10

// Explains node colours (AI category) and sizes (lines changed).
export default function Legend() {
  return (
    <div className="xp-window xp-legend">
      <div className="xp-titlebar">
        <span className="xp-title">Legend</span>
      </div>
      <div className="xp-body">
        <p className="xp-legend-heading">Colour = AI category</p>
        <ul className="xp-legend-list">
          {[...CATEGORIES, UNCLASSIFIED].map((c) => (
            <li key={c.label}>
              <span className="xp-swatch" style={{ background: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>

        <p className="xp-legend-heading">Size = lines changed</p>
        <div className="xp-legend-sizes">
          {SIZE_SAMPLES.map((lines) => {
            const { width, height } = nodeSize({ linesAdded: lines, linesDeleted: 0 })
            return (
              <div key={lines} className="xp-legend-size">
                <span
                  className="xp-size-box"
                  style={{ width: width * SIZE_RATIO, height: height * SIZE_RATIO }}
                />
                <span>{lines === MAX_IMPACT ? `${lines}+` : lines}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
