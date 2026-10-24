// Timing for the start-up sequence. All times are in milliseconds from when
// the loading dialog first appears.
export const MIN_LOADING_MS = 2200
export const SOFT_FILL_MS = 2400
export const SOFT_FILL_TO = 0.9
export const FINISH_MS = 350
export const HOLD_MS = 400
export const MAX_WAIT_MS = 8000
export const FADE_MS = 400
export const BLOCK_COUNT = 20

const clamp01 = (x) => Math.min(Math.max(x, 0), 1)
const easeOutCubic = (t) => 1 - (1 - t) ** 3

// Fake progress while we wait: eases out towards SOFT_FILL_TO and stays there.
function softFill(elapsedMs) {
  return SOFT_FILL_TO * easeOutCubic(clamp01(elapsedMs / SOFT_FILL_MS))
}

// When we treat loading as finished. The safety valve counts as ready.
function effectiveReady(readyAtMs) {
  const readyAt = readyAtMs == null ? Infinity : Math.max(readyAtMs, 0)
  return Math.min(readyAt, MAX_WAIT_MS)
}

// When the bar reaches 1. The finishing run starts at ready, but late enough
// that the dialog is up for at least MIN_LOADING_MS.
export function fullAtMs(readyAtMs) {
  return Math.max(effectiveReady(readyAtMs) + FINISH_MS, MIN_LOADING_MS)
}

// When the loading dialog should hand over to the welcome screen.
export function loadingDoneAtMs(readyAtMs) {
  return fullAtMs(readyAtMs) + HOLD_MS
}

// Progress of the loading bar, 0..1. readyAtMs is null until the history
// request has finished.
export function bootProgress(elapsedMs, readyAtMs) {
  const elapsed = Math.max(Number(elapsedMs) || 0, 0)
  const fullAt = fullAtMs(readyAtMs)
  const finishStart = fullAt - FINISH_MS
  if (elapsed < finishStart) return softFill(elapsed)
  if (elapsed >= fullAt) return 1

  // Run on linearly from wherever the soft fill had got to.
  const from = softFill(finishStart)
  return from + (1 - from) * ((elapsed - finishStart) / FINISH_MS)
}

export function litBlocks(progress) {
  const lit = Math.floor((Number(progress) || 0) * BLOCK_COUNT)
  return Math.min(Math.max(lit, 0), BLOCK_COUNT)
}

// True when the query string has boot=off, e.g. "?boot=off" or "?a=1&BOOT=OFF".
export function shouldSkipBoot(search) {
  if (typeof search !== 'string') return false
  return /(?:^|[?&])boot=off(?:&|$)/i.test(search)
}
