import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countAuthors, formatShare } from './authorStats.js'

const commit = (author) => ({ id: Math.random().toString(16).slice(2), author })

test('counts commits per author, most commits first', () => {
  const result = countAuthors([commit('Ann'), commit('Bob'), commit('Bob'), commit('Bob'), commit('Ann'), commit('Cy')])
  assert.deepEqual(
    result.map((a) => [a.name, a.commits]),
    [['Bob', 3], ['Ann', 2], ['Cy', 1]],
  )
})

test('authors with the same count are sorted by name', () => {
  const result = countAuthors([commit('Zed'), commit('Amy'), commit('Max')])
  assert.deepEqual(result.map((a) => a.name), ['Amy', 'Max', 'Zed'])
})

test('shares are each author\'s part of all commits', () => {
  const result = countAuthors([commit('A'), commit('A'), commit('A'), commit('B')])
  assert.equal(result[0].share, 0.75)
  assert.equal(result[1].share, 0.25)
})

test('trims names and falls back to Unknown author', () => {
  const result = countAuthors([commit('  Ann '), commit('Ann'), commit(''), commit('   '), { id: 'x' }])
  assert.deepEqual(
    result.map((a) => [a.name, a.commits]),
    [['Unknown author', 3], ['Ann', 2]],
  )
})

test('names that differ only in case are different authors', () => {
  assert.equal(countAuthors([commit('ann'), commit('Ann')]).length, 2)
})

test('no commits gives no authors', () => {
  assert.deepEqual(countAuthors([]), [])
})

test('formatShare rounds to a whole percent', () => {
  assert.equal(formatShare(1), '100%')
  assert.equal(formatShare(0.5), '50%')
  assert.equal(formatShare(0.456), '46%')
})

test('formatShare shows <1% for a tiny share, 0% only for none', () => {
  assert.equal(formatShare(0.004), '<1%')
  assert.equal(formatShare(0), '0%')
})
