// Express app with all middleware and routes. index.js starts it.
import express from 'express'
import cors from 'cors'
import { getHistory, getReadme, GitError } from './gitService.js'
import { AiError } from './ai/gemini.js'
import { getRepoPath } from './repoCache.js'
const MAX_LIMIT = 5000

const AI_OFF = {
  error: 'AI is switched off',
  details: 'Set GEMINI_ENABLED=true in server/.env and restart the server',
}

function sendError(res, err) 
{

  if(err.status===400)
  {
    return res.status(400).json({error:err.message,details:''})
  }

  if (err instanceof AiError || err instanceof GitError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? '' })
  }
  res.status(500).json({ error: 'Unexpected server error', details: err?.message ?? '' })
}

export function createApp({ repoPath, ai }) {
  const app = express()

  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', repo: repoPath, ai: ai.health() })
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

    try 
    {
      const repoURL = req.query.repo;
      let dir = repoPath;
      if(typeof repoURL==='string' && repoURL.trim()!== '')
      {
        dir = await getRepoPath(repoURL);
      }
      res.json(await getHistory(dir, { limit }))
    } 
    catch (err) 
    {
      sendError(res, err)
    }
  })

  app.get('/api/readme', async (req, res) => {
    try {
      const repoURL = req.query.repo
      let dir = repoPath
      if (typeof repoURL === 'string' && repoURL.trim() !== '') {
        // The history request just fetched it, so don't fetch again.
        dir = await getRepoPath(repoURL, { refresh: false })
      }
      res.json(await getReadme(dir))
    } catch (err) {
      sendError(res, err)
    }
  })

  app.post('/api/summary', async (req, res) => {
    if (!ai.enabled) return res.status(503).json(AI_OFF)

    try {
      // Same repo as the history request, so picked repos work too.
      const repoURL = req.body?.repo
      let dir = repoPath
      if (typeof repoURL === 'string' && repoURL.trim() !== '') {
        dir = await getRepoPath(repoURL)
      }
      res.json({ summary: await ai.summarize(req.body?.id, dir) })
    } catch (err) {
      sendError(res, err)
    }
  })

  // Bad JSON or an oversized body from express.json().
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)
    const status = err.status >= 400 && err.status < 500 ? 400 : 500
    res.status(status).json({
      error: status === 400 ? 'Invalid request body' : 'Unexpected server error',
      details: err.type === 'entity.too.large' ? 'Body is larger than 100kb' : 'Send JSON like { "id": "<commit hash>" }',
    })
  })

  return app
}
