// A plain description built only from the commit's own fields, used when
// the AI summary isn't available. States facts only, never intent.

function sizeBucket(lines) {
  if (lines < 10) return 'tiny'
  if (lines < 100) return 'small'
  if (lines < 500) return 'medium'
  if (lines < 2000) return 'large'
  return 'very large'
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function describeLines(added, deleted) {
  if (deleted === 0) return `that adds ${plural(added, 'line')}`
  if (added === 0) return `that removes ${plural(deleted, 'line')}`
  return `that adds ${plural(added, 'line')} and removes ${plural(deleted, 'line')}`
}

// Uses the calendar date as written in the commit, so the result doesn't
// depend on the viewer's time zone.
function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function count(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function basicSummary(commit) {
  const added = count(commit?.linesAdded)
  const deleted = count(commit?.linesDeleted)
  const parents = Array.isArray(commit?.parents) ? commit.parents.length : 0
  const empty = added + deleted === 0
  const change = `a ${sizeBucket(added + deleted)} change ${describeLines(added, deleted)}`

  let first
  if (parents === 0) {
    first = `The first commit in the repository, ${empty ? 'with no line changes' : change}.`
  } else if (parents > 1) {
    first = `A merge commit joining ${parents} branches, ${empty ? 'with no line changes of its own' : change}.`
  } else {
    first = empty ? 'A commit with no line changes.' : `${change[0].toUpperCase()}${change.slice(1)}.`
  }

  const author = typeof commit?.author === 'string' && commit.author.trim() ? commit.author.trim() : 'an unknown author'
  const date = formatDate(commit?.date)
  const second = date ? `Made by ${author} on ${date}.` : `Made by ${author}.`

  return `${first} ${second}`
}
