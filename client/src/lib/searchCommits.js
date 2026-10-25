// Plain-text search over the loaded commits, like the browser's Ctrl+F.

const timeOf = (commit) => {
  const time = Date.parse(commit.date)
  return Number.isNaN(time) ? -Infinity : time
}

// Ids of the visible commits whose message, author or full hash contains the
// query (case-insensitive, no regex), newest first. Ties keep arrival order.
export function findMatches(commits, query, visibleIds) {
  const needle = typeof query === 'string' ? query.trim().toLowerCase() : ''
  if (!needle || !Array.isArray(commits)) return []

  const hits = []
  commits.forEach((commit, index) => {
    if (!commit || !visibleIds?.has(commit.id)) return
    const found = [commit.message, commit.author, commit.id].some(
      (field) => typeof field === 'string' && field.toLowerCase().includes(needle),
    )
    if (found) hits.push({ id: commit.id, time: timeOf(commit), index })
  })

  return hits.sort((a, b) => b.time - a.time || a.index - b.index).map((hit) => hit.id)
}

// Next (direction 1) or previous (-1) index, wrapping at both ends.
// An index outside the list starts from the first or last match.
export function stepIndex(index, count, direction) {
  if (!(count > 0)) return -1
  if (!(index >= 0 && index < count)) return direction < 0 ? count - 1 : 0
  return (((index + direction) % count) + count) % count
}
