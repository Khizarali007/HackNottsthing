import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGitLog } from '../parser.js'

// 40-character hash made from one repeated hex digit, e.g. id('a').
const id = (char) => char.repeat(40)

// Builds one header line the way git prints it with our --pretty format.
function header({ hash, parents = [], author = 'Sam Lee', date = '2026-10-24T12:00:00+01:00', message }) {
  return [hash, parents.join(' '), author, date, message].join('\x1f')
}

function record(fields, numstat = []) {
  return [header(fields), ...numstat].join('\n')
}

// Git separates records with a blank line.
const log = (...records) => records.join('\n\n')

test('empty input gives an empty array', () => {
  assert.deepEqual(parseGitLog(''), [])
  assert.deepEqual(parseGitLog('   \n\n'), [])
  assert.deepEqual(parseGitLog(undefined), [])
})

test('returns every contract key with the right values', () => {
  const [commit] = parseGitLog(
    log(record({ hash: id('b'), parents: [id('a')], message: 'Add parser' }, ['10\t2\tserver/parser.js'])),
  )
  assert.deepEqual(commit, {
    id: id('b'),
    parents: [id('a')],
    author: 'Sam Lee',
    date: '2026-10-24T12:00:00+01:00',
    message: 'Add parser',
    linesAdded: 10,
    linesDeleted: 2,
    aiCategory: null,
  })
})

test('root commit has no parents', () => {
  const [root] = parseGitLog(record({ hash: id('a'), message: 'Initial commit' }, ['5\t0\tREADME.md']))
  assert.deepEqual(root.parents, [])
  assert.equal(root.linesAdded, 5)
})

test('merge commit keeps both parents and counts 0/0 without numstat', () => {
  const [merge] = parseGitLog(
    record({ hash: id('c'), parents: [id('a'), id('b')], message: "Merge branch 'feature' into main" }),
  )
  assert.deepEqual(merge.parents, [id('a'), id('b')])
  assert.equal(merge.linesAdded, 0)
  assert.equal(merge.linesDeleted, 0)
  assert.equal(merge.message, "Merge branch 'feature' into main")
})

test('binary files count as 0 and other files still add up', () => {
  const [commit] = parseGitLog(
    record({ hash: id('d'), parents: [id('a')], message: 'Add logo' }, [
      '-\t-\tlogo.png',
      '3\t1\tindex.html',
      '4\t0\tstyle.css',
    ]),
  )
  assert.equal(commit.linesAdded, 7)
  assert.equal(commit.linesDeleted, 1)
})

test('messages with pipes, quotes and emoji are kept intact', () => {
  // \u{1F680} is the rocket emoji.
  const message = 'Fix "quoted" | piped \'thing\' \u{1F680} done'
  const [commit] = parseGitLog(record({ hash: id('e'), parents: [id('a')], message }))
  assert.equal(commit.message, message)
})

test('a message mentioning Merge is not treated specially', () => {
  const [commit] = parseGitLog(
    record({ hash: id('f'), parents: [id('a')], message: 'Merge sort for the commit list' }, ['12\t4\tsort.js']),
  )
  assert.deepEqual(commit.parents, [id('a')])
  assert.equal(commit.linesAdded, 12)
})

test('parses several records in order', () => {
  const commits = parseGitLog(
    log(
      record({ hash: id('c'), parents: [id('b')], message: 'Third' }, ['1\t1\ta.js']),
      record({ hash: id('b'), parents: [id('a')], message: 'Second' }),
      record({ hash: id('a'), message: 'First' }, ['2\t0\ta.js']),
    ),
  )
  assert.deepEqual(
    commits.map((c) => c.message),
    ['Third', 'Second', 'First'],
  )
  assert.equal(commits[1].linesAdded, 0)
})

test('handles Windows line endings', () => {
  const text = log(
    record({ hash: id('b'), parents: [id('a')], message: 'Second' }, ['1\t2\ta.js']),
    record({ hash: id('a'), message: 'First' }),
  ).replace(/\n/g, '\r\n')
  const commits = parseGitLog(text)
  assert.equal(commits.length, 2)
  assert.equal(commits[0].linesDeleted, 2)
})

test('skips malformed records instead of throwing', () => {
  const commits = parseGitLog(
    log(
      record({ hash: id('c'), parents: [id('b')], message: 'Good' }),
      // Too few fields.
      `${id('b')}\x1f${id('a')}\x1fSam Lee`,
      // Bad parent hash.
      record({ hash: id('9'), parents: ['nothex'], message: 'Bad parent' }),
      // Unparseable date.
      record({ hash: id('8'), date: 'yesterday', message: 'Bad date' }),
      'random junk line',
      record({ hash: id('a'), message: 'Also good' }),
    ),
  )
  assert.deepEqual(
    commits.map((c) => c.message),
    ['Good', 'Also good'],
  )
})

test('ignores stray lines that are not numstat', () => {
  const [commit] = parseGitLog(
    record({ hash: id('a'), message: 'First' }, ['', 'not a stat line', '2\t3\tfile.txt']),
  )
  assert.equal(commit.linesAdded, 2)
  assert.equal(commit.linesDeleted, 3)
})
