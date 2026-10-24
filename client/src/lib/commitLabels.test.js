import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CANDIDATE_LABELS, toCategory } from './commitLabels.js'

test('candidate labels are the four model labels', () => {
  assert.deepEqual(CANDIDATE_LABELS, ['bug fix', 'new feature', 'code refactoring', 'chore'])
})

test('each label maps to its contract category', () => {
  assert.equal(toCategory('bug fix'), 'Bugfix')
  assert.equal(toCategory('new feature'), 'Feature')
  assert.equal(toCategory('code refactoring'), 'Refactor')
  assert.equal(toCategory('chore'), 'Chore')
})

test('unknown input gives null', () => {
  for (const input of ['', 'Bug Fix', 'feature', 'toString', '__proto__', null, undefined, 42]) {
    assert.equal(toCategory(input), null, `expected null for ${String(input)}`)
  }
})
