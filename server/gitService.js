// Runs git commands against a repository and returns its commit history.
import { spawn } from 'node:child_process'
import { statSync } from 'node:fs'
import { parseGitLog } from './parser.js'

const LOG_FORMAT = '%H%x1f%P%x1f%an%x1f%aI%x1f%s'

// status is the HTTP status the API should answer with.
export class GitError extends Error {
  constructor(message, details, status) {
    super(message)
    this.details = details
    this.status = status
  }
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    // No shell, so paths and arguments are passed through as-is.
    const child = spawn('git', args, { windowsHide: true })
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new GitError('Git is not installed or not on PATH', err.message, 500))
      } else {
        reject(new GitError('Failed to run git', err.message, 500))
      }
    })

    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(Object.assign(new Error('git exited with code ' + code), { code, stderr }))
    })
  })
}

// Root-level files that count as the readme, best first.
const README_ORDER = ['md', 'markdown', 'mdown', '', 'txt', 'rst', 'adoc', 'textile']
const README_NAME = /^readme(?:\.(md|markdown|mdown|txt|rst|adoc|textile))?$/i
// Longer readmes are cut off here.
export const README_MAX_BYTES = 200 * 1024

// Picks the readme out of `git ls-tree -z` output (regular files only).
export function pickReadme(listing) {
  const found = []
  for (const entry of listing.split('\0')) {
    const match = entry.match(/^(\d+) blob ([0-9a-f]+)\t(.+)$/)
    if (!match || !['100644', '100755'].includes(match[1])) continue
    const name = match[3]
    const parts = name.match(README_NAME)
    if (!parts) continue
    found.push({ name, sha: match[2], rank: README_ORDER.indexOf((parts[1] || '').toLowerCase()) })
  }
  // Same rank: README before readme, then by name.
  found.sort((a, b) => a.rank - b.rank || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return found[0] ?? null
}

// Reads at most maxBytes of a file, then stops git.
function readBlob(repoPath, sha, maxBytes) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'cat-file', 'blob', sha], { windowsHide: true })
    const chunks = []
    let size = 0
    let truncated = false
    child.stdout.on('data', (chunk) => {
      if (truncated) return
      chunks.push(chunk)
      size += chunk.length
      if (size > maxBytes) {
        truncated = true
        child.kill()
      }
    })
    child.on('error', (err) => reject(new GitError('Failed to run git', err.message, 500)))
    child.on('close', (code) => {
      if (code !== 0 && !truncated) reject(new GitError('Failed to read the readme', '', 500))
      else resolve({ buffer: Buffer.concat(chunks).subarray(0, maxBytes), truncated })
    })
  })
}

// The readme in the repo's root at HEAD, as { name, content, truncated }.
// name is null (and content empty) when there isn't one.
export async function getReadme(repoPath) {
  const none = { name: null, content: '', truncated: false }
  if (!isDirectory(repoPath)) {
    throw new GitError('Repository path does not exist', repoPath, 400)
  }

  let listing
  try {
    // --full-tree lists the repo root even when repoPath is a subfolder (the
    // server runs from server/ by default).
    ;({ stdout: listing } = await runGit(['-C', repoPath, '-c', 'core.quotepath=false', 'ls-tree', '--full-tree', '-z', 'HEAD']))
  } catch (err) {
    if (err instanceof GitError) throw err
    const stderr = (err.stderr || '').trim()
    if (/not a git repository/i.test(stderr)) {
      throw new GitError('Path is not a git repository', repoPath, 400)
    }
    // Fresh repo with no commits yet.
    if (/not a valid object name|unknown revision|bad revision/i.test(stderr)) return none
    throw new GitError('Failed to read the readme', stderr || err.message, 500)
  }

  const readme = pickReadme(listing)
  if (!readme) return none

  const { buffer, truncated } = await readBlob(repoPath, readme.sha, README_MAX_BYTES)
  // A binary file is not a readme worth showing.
  if (buffer.includes(0)) return { name: readme.name, content: '', truncated: false }

  const content = buffer.toString('utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  return { name: readme.name, content, truncated }
}

export async function getHistory(repoPath, { limit } = {}) {
  if (!isDirectory(repoPath)) {
    throw new GitError('Repository path does not exist', repoPath, 400)
  }

  const args = [
    '-C', repoPath,
    '-c', 'core.quotepath=false',
    'log', '--all', '--topo-order', '--no-renames',
    `--pretty=format:${LOG_FORMAT}`,
    '--numstat',
  ]
  if (limit) args.push('-n', String(limit))

  try {
    const { stdout } = await runGit(args)
    return parseGitLog(stdout)
  } catch (err) {
    if (err instanceof GitError) throw err

    const stderr = (err.stderr || '').trim()
    if (/not a git repository/i.test(stderr)) {
      throw new GitError('Path is not a git repository', repoPath, 400)
    }
    // Fresh repo with no commits yet.
    if (/does not have any commits yet/i.test(stderr)) return []

    throw new GitError('Failed to read git history', stderr || err.message, 500)
  }
}

const MAX_MESSAGE_LENGTH = 1500
const MAX_FILES = 25
const NOT_FOUND = /unknown revision|bad object|bad revision|not a valid object|could not get object|ambiguous argument/i

// Facts about one commit for the summary feature: metadata plus changed file
// names with line counts. Never includes diff content.
// Returns null if the commit doesn't exist.
export async function getCommitDetails(repoPath, id) {
  if (!isDirectory(repoPath)) {
    throw new GitError('Repository path does not exist', repoPath, 400)
  }

  const base = ['-C', repoPath, '-c', 'core.quotepath=false']
  // ^{commit} so a tree or blob hash doesn't count as a commit.
  const rev = `${id}^{commit}`

  let meta
  try {
    meta = await runGit([...base, 'show', '-s', '--format=%an%x1f%aI%x1f%P%x1f%B', rev])
  } catch (err) {
    if (err instanceof GitError) throw err
    const stderr = (err.stderr || '').trim()
    if (/not a git repository/i.test(stderr)) {
      throw new GitError('Path is not a git repository', repoPath, 400)
    }
    if (NOT_FOUND.test(stderr)) return null
    throw new GitError('Failed to read commit', stderr || err.message, 500)
  }

  const [author = '', date = '', parentField = '', ...messageParts] = meta.stdout.split('\x1f')
  const parentCount = parentField.split(' ').filter(Boolean).length
  const message = messageParts.join('\x1f').trim().slice(0, MAX_MESSAGE_LENGTH)

  let files = []
  let totalFiles = 0
  // Merges have no single diff worth listing.
  if (parentCount < 2) {
    const stat = await runGit([...base, 'show', '--numstat', '--format=', '--no-renames', rev]).catch(
      (err) => {
        throw new GitError('Failed to read commit files', (err.stderr || err.message || '').trim(), 500)
      },
    )
    const all = stat.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/))
      .filter(Boolean)
      .map(([, added, deleted, path]) => ({
        path,
        added: added === '-' ? 0 : Number(added),
        deleted: deleted === '-' ? 0 : Number(deleted),
      }))
    totalFiles = all.length
    files = all.slice(0, MAX_FILES)
  }

  return { id, author, date, parentCount, message, files, totalFiles }
}
