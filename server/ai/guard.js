// Every real Gemini call goes through here: call cap, one retry, logging
// and a cache that survives restarts.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AiError } from './gemini.js'

export const DEFAULT_CACHE_PATH = path.join(os.tmpdir(), 'gitstory-ai-cache.json')
const RETRY_STATUSES = [429, 503]

function loadCache(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return new Map(Object.entries(data).filter(([, v]) => typeof v === 'string'))
    }
  } catch {
    // Missing or corrupt file, start empty.
  }
  return new Map()
}

function saveCache(file, cache) {
  try {
    fs.writeFileSync(file, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    // Losing the saved cache only costs a call later.
  }
}

export function createGuard({
  client,
  maxCalls,
  cachePath = DEFAULT_CACHE_PATH,
  log = console.log,
  retryDelayMs = 2000,
}) {
  let callsUsed = 0
  const cache = loadCache(cachePath)
  // Same key requested twice at once shares one call.
  const inFlight = new Map()

  async function call(task, prompt) {
    for (let attempt = 1; ; attempt++) {
      if (callsUsed >= maxCalls) {
        throw new AiError('AI call limit reached', 429, {
          details: `Used ${callsUsed} of ${maxCalls} calls. Restart the server or raise GEMINI_MAX_CALLS.`,
        })
      }
      // Counted before sending, so failed calls use up the budget too.
      callsUsed++
      const started = Date.now()
      try {
        const text = await client.generate({ prompt })
        log(`[ai] ${task} call ${callsUsed}/${maxCalls} ${Date.now() - started}ms`)
        return text
      } catch (err) {
        const status = err?.upstreamStatus
        log(`[ai] ${task} call ${callsUsed}/${maxCalls} ${Date.now() - started}ms failed${status ? ` (${status})` : ''}`)
        if (attempt === 1 && RETRY_STATUSES.includes(status)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          continue
        }
        throw err
      }
    }
  }

  async function cached(key, produce) {
    if (cache.has(key)) return cache.get(key)
    if (inFlight.has(key)) return inFlight.get(key)

    const promise = produce()
      .then((value) => {
        cache.set(key, value)
        saveCache(cachePath, cache)
        return value
      })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, promise)
    return promise
  }

  return {
    call,
    cached,
    get callsUsed() {
      return callsUsed
    },
  }
}
