import { useCallback, useEffect, useState } from 'react'
import mockData from '../data/mockData.json'

const HISTORY_URL = 'http://localhost:3001/api/history'

// Loads commits from the backend. If the server can't be reached at all,
// falls back to the bundled sample data so the UI still demos.
// status: 'loading' | 'ready' | 'error'
export default function useCommitHistory() {
  const [commits, setCommits] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [usingSample, setUsingSample] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetch(HISTORY_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Unexpected response from /api/history')
        setCommits(data)
        setUsingSample(false)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        // fetch throws TypeError when the server isn't running.
        if (err instanceof TypeError) {
          setCommits(mockData)
          setUsingSample(true)
          setStatus('ready')
        } else {
          setError(err.message)
          setStatus('error')
        }
      })

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  return { commits, setCommits, status, error, usingSample, retry }
}
