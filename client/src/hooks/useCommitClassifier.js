import { useCallback, useEffect, useRef, useState } from 'react'

// Runs the classifier worker and collects a category for each commit id.
// status: 'loading' | 'ready' | 'error', progress: 0..1 while the model downloads.
export default function useCommitClassifier() {
  const workerRef = useRef(null)
  // Ids that have a result, or have been sent to the current worker.
  const doneRef = useRef(new Set())
  const pendingRef = useRef(new Set())
  const [categories, setCategories] = useState({})
  const [status, setStatus] = useState('loading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const pending = pendingRef.current

    worker.onmessage = (event) => {
      const { type, payload } = event.data
      if (type === 'progress') {
        setProgress(payload)
      } else if (type === 'ready') {
        setProgress(1)
        setStatus('ready')
      } else if (type === 'result') {
        pending.delete(payload.id)
        doneRef.current.add(payload.id)
        setCategories((prev) => ({ ...prev, [payload.id]: payload.category }))
      } else if (type === 'error') {
        console.error('Commit classifier failed:', payload)
        setStatus('error')
      }
    }
    // Fires if the worker script itself fails to load.
    worker.onerror = (event) => {
      console.error('Commit classifier failed:', event.message)
      setStatus('error')
    }

    worker.postMessage({ type: 'init' })

    // Terminate this effect's own worker, so StrictMode's mount/unmount/mount
    // leaves exactly one running.
    return () => {
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
      // Anything sent to this worker never got an answer.
      pending.clear()
    }
  }, [])

  const classifyCommits = useCallback((commits) => {
    const worker = workerRef.current
    if (!worker) return

    const todo = commits
      .filter((c) => !doneRef.current.has(c.id) && !pendingRef.current.has(c.id))
      .map((c) => ({ id: c.id, message: c.message }))
    if (todo.length === 0) return

    todo.forEach((c) => pendingRef.current.add(c.id))
    worker.postMessage({ type: 'classify', payload: todo })
  }, [])

  return { classifyCommits, categories, status, progress }
}
