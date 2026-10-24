// Cleans up commit data from the server before the UI uses it.
// Only the exact contract key names are read.

export const MAX_COMMITS = 500

const CATEGORIES = ['Bugfix', 'Feature', 'Refactor', 'Chore']

function toText(value, fallback) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

// Line counts feed a square root for node size, so keep them finite and >= 0.
function toCount(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function toTime(date) {
  const t = Date.parse(date)
  return Number.isNaN(t) ? -Infinity : t
}

function normalizeOne(raw) {
  return {
    id: raw.id,
    parents: Array.isArray(raw.parents)
      ? raw.parents.filter((p) => typeof p === 'string' && p !== '')
      : [],
    author: toText(raw.author, '').trim() || 'Unknown author',
    date: toText(raw.date, ''),
    message: toText(raw.message, ''),
    linesAdded: toCount(raw.linesAdded),
    linesDeleted: toCount(raw.linesDeleted),
    aiCategory: CATEGORIES.includes(raw.aiCategory) ? raw.aiCategory : null,
  }
}

// Returns { commits, total, dropped }. `total` counts valid commits before the
// MAX_COMMITS cut, `dropped` is how many of those were left out.
export function normalizeCommits(data) {
  const seen = new Set()
  const valid = []

  for (const raw of Array.isArray(data) ? data : []) {
    if (!raw || typeof raw !== 'object') continue
    if (typeof raw.id !== 'string' || raw.id === '' || seen.has(raw.id)) continue
    seen.add(raw.id)
    valid.push(normalizeOne(raw))
  }

  if (valid.length <= MAX_COMMITS) {
    return { commits: valid, total: valid.length, dropped: 0 }
  }

  // Keep the newest by date, but in the original (topological) order.
  const keep = new Set(
    [...valid]
      .sort((a, b) => toTime(b.date) - toTime(a.date))
      .slice(0, MAX_COMMITS)
      .map((c) => c.id),
  )
  return {
    commits: valid.filter((c) => keep.has(c.id)),
    total: valid.length,
    dropped: valid.length - MAX_COMMITS,
  }
}
