// Puts the AI pieces together for the app. When AI is off nothing here
// loads the SDK or reads the cache.
import { createGeminiClient } from './gemini.js'
import { createGuard } from './guard.js'
import { summarizeCommit } from './summarize.js'

export function createAi(config, { client, cachePath, log, retryDelayMs, getDetails } = {}) {
  const { enabled, model, maxCalls } = config

  if (!enabled) {
    return {
      enabled: false,
      health: () => ({ enabled: false, model, callsUsed: 0, maxCalls }),
    }
  }

  const guard = createGuard({
    client: client ?? createGeminiClient({ apiKey: config.apiKey, model }),
    maxCalls,
    cachePath,
    log,
    retryDelayMs,
  })

  return {
    enabled: true,
    health: () => ({ enabled: true, model, callsUsed: guard.callsUsed, maxCalls }),
    summarize: (id, repoPath) => summarizeCommit(id, { repoPath, guard, model, getDetails }),
  }
}
