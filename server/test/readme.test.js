import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../app.js'
import { getReadme, pickReadme, README_MAX_BYTES } from '../gitService.js'

const NONE = { name: null, content: '', truncated: false }
const SHA = 'a'.repeat(40)
const stubAi = { enabled: false, health: () => ({ enabled: false }) }

let tmp
let count = 0

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gitstory-readme-'))
})

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

function git(repo, ...args) {
  return execFileSync(
    'git',
    ['-C', repo, '-c', 'user.name=Test User', '-c', 'user.email=test@example.com', '-c', 'core.autocrlf=false', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim()
}

// New repo with the given files (path -> string or Buffer) in one commit.
// With no files it has no commits at all.
function makeRepo(files = {}) {
  const repo = path.join(tmp, `repo-${++count}`)
  fs.mkdirSync(repo)
  git(repo, 'init', '-q', '-b', 'main')
  const names = Object.keys(files)
  if (names.length === 0) return repo
  for (const name of names) {
    const file = path.join(repo, name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, files[name])
  }
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'Initial commit')
  return repo
}

async function withApp(repoPath, fn) {
  const server = createApp({ repoPath, ai: stubAi }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    return await fn(base)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

describe('getReadme', () => {
  test('returns the root README.md with its content', async () => {
    const repo = makeRepo({ 'README.md': '# Hello\n\nSome text.\n', 'a.txt': 'a\n' })
    assert.deepEqual(await getReadme(repo), { name: 'README.md', content: '# Hello\n\nSome text.\n', truncated: false })
  })

  test('a subfolder of the repo still gets the root readme', async () => {
    const repo = makeRepo({ 'README.md': 'root\n', 'server/index.js': 'x\n' })
    assert.equal((await getReadme(path.join(repo, 'server'))).name, 'README.md')
  })

  test('no readme gives name null', async () => {
    const repo = makeRepo({ 'a.txt': 'a\n' })
    assert.deepEqual(await getReadme(repo), NONE)
  })

  test('a README.md inside a subfolder is ignored', async () => {
    const repo = makeRepo({ 'docs/README.md': 'docs\n', 'a.txt': 'a\n' })
    assert.deepEqual(await getReadme(repo), NONE)
  })

  test('readme.txt matches case-insensitively', async () => {
    const repo = makeRepo({ 'readme.txt': 'lower case\n' })
    assert.deepEqual(await getReadme(repo), { name: 'readme.txt', content: 'lower case\n', truncated: false })
  })

  test('README.md is preferred over README.txt', async () => {
    const repo = makeRepo({ 'README.txt': 'text\n', 'README.md': 'markdown\n' })
    const readme = await getReadme(repo)
    assert.equal(readme.name, 'README.md')
    assert.equal(readme.content, 'markdown\n')
  })

  test('drops a leading BOM and turns CRLF into LF', async () => {
    const repo = makeRepo({ 'README.md': '﻿line one\r\nline two\r\n' })
    assert.equal((await getReadme(repo)).content, 'line one\nline two\n')
  })

  test('a long readme is cut off at README_MAX_BYTES', async () => {
    const repo = makeRepo({ 'README.md': 'x'.repeat(README_MAX_BYTES + 5000) })
    const readme = await getReadme(repo)
    assert.equal(readme.truncated, true)
    assert.equal(readme.content.length, README_MAX_BYTES)
  })

  test('a binary README gives the name with empty content', async () => {
    const repo = makeRepo({ README: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]) })
    assert.deepEqual(await getReadme(repo), { name: 'README', content: '', truncated: false })
  })

  test('a repo with no commits gives name null', async () => {
    const repo = makeRepo()
    assert.deepEqual(await getReadme(repo), NONE)
  })

  test('a folder that is not a repo or does not exist rejects with 400', async () => {
    const plain = path.join(tmp, 'not-a-repo')
    fs.mkdirSync(plain)
    await assert.rejects(getReadme(plain), { status: 400, message: 'Path is not a git repository' })
    await assert.rejects(getReadme(path.join(tmp, 'missing')), { status: 400, message: 'Repository path does not exist' })
  })
})

describe('pickReadme', () => {
  test('skips a directory and a symlink named README', () => {
    const listing = [`040000 tree ${SHA}\tREADME`, `120000 blob ${SHA}\tREADME.md`, ''].join('\0')
    assert.equal(pickReadme(listing), null)
  })

  test('still picks a regular file next to them', () => {
    const listing = [`040000 tree ${SHA}\tREADME`, `100644 blob ${'b'.repeat(40)}\tREADME.txt`, ''].join('\0')
    assert.equal(pickReadme(listing).name, 'README.txt')
  })
})

describe('/api/readme', () => {
  test('returns the readme of the default repo', async () => {
    const repo = makeRepo({ 'README.md': 'Served readme\n' })
    await withApp(repo, async (base) => {
      const res = await fetch(`${base}/api/readme`)
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), { name: 'README.md', content: 'Served readme\n', truncated: false })
    })
  })

  test('a repo without a readme is a 200 with name null', async () => {
    const repo = makeRepo({ 'a.txt': 'a\n' })
    await withApp(repo, async (base) => {
      const res = await fetch(`${base}/api/readme`)
      assert.equal(res.status, 200)
      assert.deepEqual(await res.json(), NONE)
    })
  })

  test('a repo that is not a GitHub URL gives 400', async () => {
    const repo = makeRepo({ 'README.md': 'x\n' })
    await withApp(repo, async (base) => {
      const res = await fetch(`${base}/api/readme?repo=${encodeURIComponent('https://example.com/a/b')}`)
      assert.equal(res.status, 400)
      assert.equal((await res.json()).error, 'Only https://github.com/owner/repo URLs are supported.')
    })
  })
})
