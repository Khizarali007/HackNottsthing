// Express API server that serves git history to the client.
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { getHistory, GitError } from './gitService.js'

const PORT = Number(process.env.PORT) || 3001
const MAX_LIMIT = 5000

// --repo <path> wins over REPO_PATH, which wins over the current directory.
function resolveRepoPath(argv) {
  const flag = argv.indexOf('--repo')
  const fromArg = flag !== -1 ? argv[flag + 1] : undefined
  return path.resolve(fromArg || process.env.REPO_PATH || process.cwd())
}

const REPO_PATH = resolveRepoPath(process.argv.slice(2))

const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', repo: REPO_PATH })
})

app.get('/api/history', async (req, res) => {
  let limit
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit)
    if (!Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({
        error: 'Invalid limit',
        details: `limit must be a positive integer (max ${MAX_LIMIT})`,
      })
    }
    limit = Math.min(limit, MAX_LIMIT)
  }

  try {
    res.json(await getHistory(REPO_PATH, { limit }))
  } catch (err) {
    if (err instanceof GitError) {
      return res.status(err.status).json({ error: err.message, details: err.details })
    }
    res.status(500).json({ error: 'Unexpected server error', details: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Reading git history from ${REPO_PATH}`)
  console.log(`Server listening on http://localhost:${PORT}`)
})
