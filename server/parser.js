// Parses raw git log output into commit objects.
//
// Expected input comes from:
//   git log --pretty=format:%H%x1f%P%x1f%an%x1f%aI%x1f%s --numstat
// Each record is a header line with fields separated by \x1f, followed by
// numstat lines ("added<TAB>deleted<TAB>path").

const SEP = '\x1f'
const RECORD_START = /\n(?=[0-9a-f]{40}\x1f)/
const HASH = /^[0-9a-f]{40}$/
const NUMSTAT = /^(\d+|-)\t(\d+|-)\t/

// Binary files show "-" instead of a count.
function toCount(value) {
  return value === '-' ? 0 : Number(value)
}

function parseRecord(record) {
  const [header, ...statLines] = record.split('\n')
  const fields = header.split(SEP)
  if (fields.length < 5) return null

  const [id, parentField, author, date, ...messageParts] = fields
  const parents = parentField.split(' ').filter(Boolean)

  if (!HASH.test(id) || !parents.every((p) => HASH.test(p))) return null
  if (Number.isNaN(Date.parse(date))) return null

  let linesAdded = 0
  let linesDeleted = 0
  for (const line of statLines) {
    const match = line.match(NUMSTAT)
    if (!match) continue
    linesAdded += toCount(match[1])
    linesDeleted += toCount(match[2])
  }

  return {
    id,
    parents,
    author,
    date,
    // A subject could in theory contain the separator, so keep the rest intact.
    message: messageParts.join(SEP),
    linesAdded,
    linesDeleted,
    aiCategory: null,
  }
}

// Malformed records are skipped rather than failing the whole history.
export function parseGitLog(stdout) {
  if (typeof stdout !== 'string') return []
  const text = stdout.replace(/\r\n/g, '\n').trim()
  if (!text) return []

  return text
    .split(RECORD_START)
    .map(parseRecord)
    .filter(Boolean)
}
