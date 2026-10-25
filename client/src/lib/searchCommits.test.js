import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findMatches, stepIndex } from './searchCommits.js'

const commit = (id, message, author, date) => ({ id, message, author, date })

// Listed newest first, like git log.
const COMMITS = [
  commit('c3a1f0e9d8b7c6a5f4e3d2c1b0a9f8e7d6c5b4a3', 'Fix login bug (again)', 'Alice', '2024-03-03T10:00:00Z'),
  commit('b2f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3c2', 'Add search box [x]', 'Bob', '2024-03-02T10:00:00Z'),
  commit('a1e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3c2b1', 'Refactor a.b( helper', 'Carol Login', '2024-03-01T10:00:00Z'),
]
const ALL = new Set(COMMITS.map((c) => c.id))

test('matches the message case-insensitively', () => {
  assert.deepEqual(findMatches(COMMITS, 'SEARCH', ALL), [COMMITS[1].id])
  assert.deepEqual(findMatches(COMMITS, 'refactor', ALL), [COMMITS[2].id])
})

test('matches the author case-insensitively', () => {
  assert.deepEqual(findMatches(COMMITS, 'bob', ALL), [COMMITS[1].id])
  assert.deepEqual(findMatches(COMMITS, 'ALICE', ALL), [COMMITS[0].id])
})

test('matches message and author together', () => {
  // "login" is in commit 0's message and commit 2's author.
  assert.deepEqual(findMatches(COMMITS, 'Login', ALL), [COMMITS[0].id, COMMITS[2].id])
})

test('matches the full hash and a short hash prefix', () => {
  assert.deepEqual(findMatches(COMMITS, COMMITS[1].id, ALL), [COMMITS[1].id])
  assert.deepEqual(findMatches(COMMITS, 'B2F0E9D', ALL), [COMMITS[1].id])
})

test('trims the query', () => {
  assert.deepEqual(findMatches(COMMITS, '  bob  ', ALL), [COMMITS[1].id])
})

test('empty and whitespace-only queries match nothing', () => {
  for (const query of ['', ' ', '   \t\n', null, undefined]) {
    assert.deepEqual(findMatches(COMMITS, query, ALL), [], JSON.stringify(query))
  }
})

test('special characters are matched literally', () => {
  assert.deepEqual(findMatches(COMMITS, 'a.b(', ALL), [COMMITS[2].id])
  assert.deepEqual(findMatches(COMMITS, '[x', ALL), [COMMITS[1].id])
  assert.deepEqual(findMatches(COMMITS, '(again)', ALL), [COMMITS[0].id])
  // As regexes these would match something; as plain text they match nothing.
  for (const query of ['.*', 'e.a', '[a-z]+', '?', '\\', '^$']) {
    assert.deepEqual(findMatches(COMMITS, query, ALL), [], query)
  }
})

test('commits not in visibleIds are excluded', () => {
  const visible = new Set([COMMITS[2].id])
  assert.deepEqual(findMatches(COMMITS, 'login', visible), [COMMITS[2].id])
  assert.deepEqual(findMatches(COMMITS, 'bob', visible), [])
  assert.deepEqual(findMatches(COMMITS, 'bob', new Set()), [])
})

test('results are newest first by date, not by array order', () => {
  const shuffled = [COMMITS[2], COMMITS[0], COMMITS[1]]
  assert.deepEqual(findMatches(shuffled, 'o', ALL), [COMMITS[0].id, COMMITS[1].id, COMMITS[2].id])
})

test('a date tie keeps the order the commits arrived in', () => {
  const same = '2024-05-05T12:00:00Z'
  const tied = [
    commit('111', 'tie first', 'X', same),
    commit('222', 'tie second', 'X', same),
    commit('333', 'tie newer', 'X', '2024-05-06T12:00:00Z'),
  ]
  const visible = new Set(['111', '222', '333'])
  assert.deepEqual(findMatches(tied, 'tie', visible), ['333', '111', '222'])
})

test('missing fields and bad dates do not throw', () => {
  const odd = [{ id: 'abc' }, commit('def', null, undefined, 'not a date'), null]
  assert.deepEqual(findMatches(odd, 'ab', new Set(['abc', 'def'])), ['abc'])
  assert.deepEqual(findMatches(odd, 'de', new Set(['abc', 'def'])), ['def'])
})

test('stepIndex moves forward and wraps to the start', () => {
  assert.equal(stepIndex(0, 3, 1), 1)
  assert.equal(stepIndex(1, 3, 1), 2)
  assert.equal(stepIndex(2, 3, 1), 0)
})

test('stepIndex moves back and wraps to the end', () => {
  assert.equal(stepIndex(2, 3, -1), 1)
  assert.equal(stepIndex(0, 3, -1), 2)
})

test('stepIndex with a single match stays on it', () => {
  assert.equal(stepIndex(0, 1, 1), 0)
  assert.equal(stepIndex(0, 1, -1), 0)
})

test('stepIndex returns -1 when there are no matches', () => {
  assert.equal(stepIndex(0, 0, 1), -1)
  assert.equal(stepIndex(-1, 0, -1), -1)
})

test('stepIndex from no current match starts at the first or last', () => {
  assert.equal(stepIndex(-1, 4, 1), 0)
  assert.equal(stepIndex(-1, 4, -1), 3)
  assert.equal(stepIndex(9, 4, 1), 0)
})
