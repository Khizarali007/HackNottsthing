import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_COMMITS, normalizeCommits } from './normalizeCommits.js'

const id = (char) => char.repeat(40)

const good = {
  id: id('a'),
  parents: [],
  author: 'Sam Lee',
  date: '2026-10-24T12:00:00+01:00',
  message: 'Initial commit',
  linesAdded: 5,
  linesDeleted: 1,
  aiCategory: null,
}

test('valid commits pass through unchanged', () => {
  const { commits, total, dropped } = normalizeCommits([good])
  assert.deepEqual(commits, [good])
  assert.equal(total, 1)
  assert.equal(dropped, 0)
})

test('non-array input gives no commits', () => {
  for (const input of [null, undefined, {}, 'text', 42]) {
    assert.deepEqual(normalizeCommits(input), { commits: [], total: 0, dropped: 0 })
  }
})

test('drops entries without a string id', () => {
  const { commits } = normalizeCommits([
    null,
    'not an object',
    { ...good, id: undefined },
    { ...good, id: 123 },
    { ...good, id: '' },
    good,
  ])
  assert.deepEqual(commits.map((c) => c.id), [id('a')])
})

test('keeps the first copy of a duplicated id', () => {
  const { commits } = normalizeCommits([good, { ...good, message: 'Duplicate' }])
  assert.equal(commits.length, 1)
  assert.equal(commits[0].message, 'Initial commit')
})

test('parents become an array of strings', () => {
  const [a, b, c] = normalizeCommits([
    { ...good, id: id('a'), parents: 'abc' },
    { ...good, id: id('b'), parents: [id('a'), 7, null, ''] },
    { ...good, id: id('c'), parents: undefined },
  ]).commits
  assert.deepEqual(a.parents, [])
  assert.deepEqual(b.parents, [id('a')])
  assert.deepEqual(c.parents, [])
})

test('line counts become finite non-negative numbers', () => {
  const cases = [
    [12, 12],
    ['7', 7],
    [undefined, 0],
    [null, 0],
    [NaN, 0],
    [Infinity, 0],
    ['lots', 0],
    [-4, 0],
  ]
  for (const [input, expected] of cases) {
    const [commit] = normalizeCommits([{ ...good, linesAdded: input, linesDeleted: input }]).commits
    assert.equal(commit.linesAdded, expected, `linesAdded ${String(input)}`)
    assert.equal(commit.linesDeleted, expected, `linesDeleted ${String(input)}`)
  }
})

test('message and author become strings with defaults', () => {
  const [a, b, c] = normalizeCommits([
    { ...good, id: id('a'), message: undefined, author: null },
    { ...good, id: id('b'), message: 404, author: '   ' },
    { ...good, id: id('c'), message: { text: 'x' }, author: 'Ana' },
  ]).commits
  assert.equal(a.message, '')
  assert.equal(a.author, 'Unknown author')
  assert.equal(b.message, '404')
  assert.equal(b.author, 'Unknown author')
  assert.equal(c.message, '')
  assert.equal(c.author, 'Ana')
})

test('aiCategory is one of the four values or null', () => {
  const values = ['Bugfix', 'Feature', 'Refactor', 'Chore', 'bugfix', 'Docs', '', 3, undefined]
  const commits = normalizeCommits(
    values.map((aiCategory, i) => ({ ...good, id: String(i).repeat(40), aiCategory })),
  ).commits
  assert.deepEqual(
    commits.map((c) => c.aiCategory),
    ['Bugfix', 'Feature', 'Refactor', 'Chore', null, null, null, null, null],
  )
})

test('does not accept alternative key spellings', () => {
  const [commit] = normalizeCommits([
    { id: id('a'), linesadded: 9, lines_deleted: 4, Message: 'Hi', parent: [id('b')] },
  ]).commits
  assert.equal(commit.linesAdded, 0)
  assert.equal(commit.linesDeleted, 0)
  assert.equal(commit.message, '')
  assert.deepEqual(commit.parents, [])
})

test('output has exactly the contract keys', () => {
  const [commit] = normalizeCommits([{ ...good, extra: true, linesadded: 3 }]).commits
  assert.deepEqual(Object.keys(commit).sort(), [
    'aiCategory', 'author', 'date', 'id', 'linesAdded', 'linesDeleted', 'message', 'parents',
  ])
})

test(`keeps only the newest ${MAX_COMMITS} commits and reports the rest`, () => {
  const extra = 25
  const start = Date.parse('2026-01-01T00:00:00Z')
  // Newest first, like git log, with one undated commit near the top.
  const data = Array.from({ length: MAX_COMMITS + extra }, (_, i) => ({
    ...good,
    id: i.toString(16).padStart(40, '0'),
    date: new Date(start - i * 60_000).toISOString(),
  }))
  data[1].date = 'not a date'

  const { commits, total, dropped } = normalizeCommits(data)
  assert.equal(commits.length, MAX_COMMITS)
  assert.equal(total, MAX_COMMITS + extra)
  assert.equal(dropped, extra)
  assert.ok(!commits.some((c) => c.id === data[1].id), 'undated commit counts as oldest')
  assert.equal(commits[0].id, data[0].id, 'original order is kept')
  assert.ok(commits.some((c) => c.id === data[MAX_COMMITS].id))
  assert.ok(!commits.some((c) => c.id === data.at(-1).id))
})
