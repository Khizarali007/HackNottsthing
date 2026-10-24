import { useEffect, useState } from 'react'

// A full playback takes about a minute, within these per-step limits.
const PLAYBACK_MS = 60000
const MIN_STEP_MS = 50
const MAX_STEP_MS = 600

function stepMs(count) {
  return Math.min(Math.max(Math.round(PLAYBACK_MS / count), MIN_STEP_MS), MAX_STEP_MS)
}

// Scrubs through the commit history over time, styled as the XP taskbar.
// `value` is how many commits (oldest first) are visible.
// `onPlay` is called each time playback starts.
export default function TimeLapseSlider({ count, value, onChange, currentDate, onPlay }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (value >= count) setPlaying(false)
      else onChange(value + 1)
    }, stepMs(count))
    return () => clearTimeout(timer)
  }, [playing, value, count, onChange])

  function togglePlay() {
    // Replay from the first commit if we're already at the end.
    if (!playing && value >= count) onChange(1)
    if (!playing) onPlay?.()
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
