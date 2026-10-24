import { useEffect, useState } from 'react'

const STEP_MS = 400

// Scrubs through the commit history over time, styled as the XP taskbar.
// `value` is how many commits (oldest first) are visible.
export default function TimeLapseSlider({ count, value, onChange, currentDate }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (value >= count) setPlaying(false)
      else onChange(value + 1)
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, value, count, onChange])

  function togglePlay() {
    // Replay from the first commit if we're already at the end.
    if (!playing && value >= count) onChange(1)
    setPlaying(!playing)
  }

  return (
    <div className="xp-taskbar">
      <button type="button" className="xp-start" onClick={togglePlay}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>

      <input
        type="range"
        className="xp-range"
        min={1}
        max={count}
        value={value}
        onChange={(e) => {
          setPlaying(false)
          onChange(Number(e.target.value))
        }}
        aria-label="Time-lapse position"
      />

      <div className="xp-tray">
        <span>{value} / {count}</span>
        {currentDate && <span>{new Date(currentDate).toLocaleDateString()}</span>}
      </div>
    </div>
  )
}
