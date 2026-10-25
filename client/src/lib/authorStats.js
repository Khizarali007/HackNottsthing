// Commit counts per author for the Authors window.
// Authors are grouped by the exact name git recorded, so one person who
// committed under two names shows up twice.
export function countAuthors(commits) {
  const counts = new Map()
  for (const commit of commits) {
    const name = commit.author?.trim() || 'Unknown author'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const total = commits.length
  return [...counts]
    .map(([name, count]) => ({ name, commits: count, share: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.commits - a.commits || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

// Share of all commits as a whole percent; "<1%" instead of a misleading 0%.
export function formatShare(share) {
  if (share > 0 && share < 0.01) return '<1%'
  return `${Math.round(share * 100)}%`
}
