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
