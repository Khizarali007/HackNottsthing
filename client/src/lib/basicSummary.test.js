import { test } from 'node:test'
import assert from 'node:assert/strict'
import { basicSummary } from './basicSummary.js'

const P = 'a'.repeat(40)
const base = {
  id: 'b'.repeat(40),
  parents: [P],
  author: 'Sam Lee',
  date: '2026-10-24T23:30:00-05:00',
  message: 'Something',
  linesAdded: 12,
  linesDeleted: 3,
  aiCategory: null,
}

test('normal commit with added and removed lines', () => {
  assert.equal(
    basicSummary(base),
    'A small change that adds 12 lines and removes 3 lines. Made by Sam Lee on 24 October 2026.',
  )
})

test('size buckets', () => {
  const sizes = [
    [9, 'tiny'],
    [10, 'small'],
    [99, 'small'],
    [100, 'medium'],
    [499, 'medium'],
    [500, 'large'],
    [1999, 'large'],
    [2000, 'very large'],
    [50000, 'very large'],
  ]
  for (const [lines, bucket] of sizes) {
    const text = basicSummary({ ...base, linesAdded: lines, linesDeleted: 0 })
    assert.ok(text.startsWith(`A ${bucket} change`), `${lines} -> ${text}`)
  }
})

test('singular and one-sided line counts', () => {
  assert.match(basicSummary({ ...base, linesAdded: 1, linesDeleted: 0 }), /adds 1 line\./)
  assert.match(basicSummary({ ...base, linesAdded: 0, linesDeleted: 4 }), /removes 4 lines\./)
  assert.match(basicSummary({ ...base, linesAdded: 0, linesDeleted: 0 }), /^A commit with no line changes\./)
})

test('root commit wording', () => {
  assert.equal(
    basicSummary({ ...base, parents: [], linesAdded: 50, linesDeleted: 0 }),
    'The first commit in the repository, a small change that adds 50 lines. Made by Sam Lee on 24 October 2026.',
  )
})

test('merge commit wording', () => {
  assert.equal(
    basicSummary({ ...base, parents: [P, 'c'.repeat(40)], linesAdded: 0, linesDeleted: 0 }),
    'A merge commit joining 2 branches, with no line changes of its own. Made by Sam Lee on 24 October 2026.',
  )
  assert.match(
    basicSummary({ ...base, parents: [P, 'c'.repeat(40)], linesAdded: 120, linesDeleted: 0 }),
    /^A merge commit joining 2 branches, a medium change that adds 120 lines\./,
  )
})

test('missing or odd fields still give a sentence', () => {
  assert.equal(
    basicSummary({ id: 'x', parents: 'nope', author: '  ', date: 'yesterday', linesAdded: 'NaN', linesDeleted: -5 }),
    'The first commit in the repository, with no line changes. Made by an unknown author.',
  )
  assert.equal(typeof basicSummary(undefined), 'string')
})

test('does not use the commit message', () => {
  const text = basicSummary({ ...base, message: 'Fix the login bug' })
  assert.doesNotMatch(text, /login|bug/i)
})
