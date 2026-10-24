import { useCallback, useEffect, useState } from 'react'
import mockData from '../data/mockData.json'
import { normalizeCommits } from '../lib/normalizeCommits.js'

// Relative so it goes through the Vite dev proxy.
const HISTORY_URL = '/api/history'

// Our server reports problems as { error, details }.
class ServerError extends Error {}

// Thrown for anything that means the backend isn't really there.
class OfflineError extends Error {}

async function loadHistory(signal) {
  let res
  try {
    res = await fetch(HISTORY_URL, { signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new OfflineError(err.message)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (body && typeof body.error === 'string') {
      throw new ServerError(String(body.details || body.error))
    }
    // Proxy error page or a dead server, not our API.
    throw new OfflineError(`Server responded ${res.status}`)
  }

  const data = await res.json().catch(() => null)
  if (!Array.isArray(data)) throw new OfflineError('Response was not a commit list')
  return data
}

// Loads commits from the backend. If the backend is offline, falls back to
// the bundled sample data so the UI still demos.
// status: 'loading' | 'ready' | 'error'
export default function useCommitHistory() {
  const [commits, setCommits] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [usingSample, setUsingSample] = useState(false)
  // How many valid commits the server sent, and how many were cut for size.
  const [total, setTotal] = useState(0)
  const [dropped, setDropped] = useState(0)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    loadHistory(controller.signal)
      .then((data) => {
        const result = normalizeCommits(data)
        setCommits(result.commits)
        setTotal(result.total)
        setDropped(result.dropped)
        setUsingSample(false)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (err instanceof ServerError) {
          setError(err.message)
          setStatus('error')
          return
        }
        setCommits(mockData)
        setTotal(mockData.length)
        setDropped(0)
        setUsingSample(true)
        setStatus('ready')
      })

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  return { commits, setCommits, status, error, usingSample, total, dropped, retry }
}
