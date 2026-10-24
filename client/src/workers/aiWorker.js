// Web worker that classifies commit messages in the browser with transformers.js.
//
// Messages in:  { type: 'init' } | { type: 'classify', payload: [{ id, message }] }
// Messages out: { type: 'progress', payload: 0..1 } | { type: 'ready' }
//               { type: 'result', payload: { id, category } } | { type: 'error', payload: message }
import { pipeline } from '@huggingface/transformers'
import { CANDIDATE_LABELS, toCategory } from '../lib/commitLabels.js'

const MODEL = 'Xenova/mobilebert-uncased-mnli'
const CONFIDENCE_THRESHOLD = 0.4

// Bytes loaded / total per model file, combined into one progress value.
const fileProgress = new Map()
let lastProgress = 0

function onProgress(info) {
  if (info.status === 'progress' && info.file && info.total) {
    fileProgress.set(info.file, { loaded: info.loaded, total: info.total })
  } else if (info.status === 'done' && fileProgress.has(info.file)) {
    const file = fileProgress.get(info.file)
    file.loaded = file.total
  } else if (info.status !== 'ready') {
    return
  }

  let loaded = 0
  let total = 0
  for (const file of fileProgress.values()) {
    loaded += file.loaded
    total += file.total
  }
  const value = info.status === 'ready' ? 1 : total ? loaded / total : 0
  // New files can appear part way through, so don't let the bar jump backwards.
  lastProgress = Math.max(lastProgress, Math.min(value, 1))
  self.postMessage({ type: 'progress', payload: lastProgress })
}

// Cached promise so overlapping init/classify messages only load the model once.
let classifierPromise = null

function getClassifier() {
  classifierPromise ??= pipeline('zero-shot-classification', MODEL, {
    progress_callback: onProgress,
  }).catch((err) => {
    // Allow a later message to try loading again.
    classifierPromise = null
    throw err
  })
  return classifierPromise
}

function errorMessage(err) {
  return err?.message ?? String(err)
}

async function classifyOne(classifier, message) {
  const text = message.toLowerCase()
  if (text.startsWith('merge')) return 'Chore'
  if (message.split(/\s+/).length < 2) return null
  if (text.includes('readme')) return 'Chore'

  const result = await classifier(message, CANDIDATE_LABELS)
  return result.scores[0] >= CONFIDENCE_THRESHOLD ? toCategory(result.labels[0]) : null
}

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {}

  if (type === 'init') {
    try {
      await getClassifier()
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', payload: errorMessage(err) })
    }
    return
  }

  if (type === 'classify') {
    let classifier
    try {
      classifier = await getClassifier()
    } catch (err) {
      self.postMessage({ type: 'error', payload: errorMessage(err) })
      return
    }

    for (const commit of Array.isArray(payload) ? payload : []) {
      let category = null
      try {
        category = await classifyOne(classifier, String(commit.message ?? '').trim())
      } catch {
        // One bad commit shouldn't stop the rest; it just stays unclassified.
      }
      self.postMessage({ type: 'result', payload: { id: commit.id, category } })
    }
  }
}
