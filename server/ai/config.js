// Reads the Gemini settings. The summary feature is off unless
// GEMINI_ENABLED is exactly "true" and a key is set.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
export const DEFAULT_MAX_CALLS = 30

// server/.env, wherever the server was started from.
const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env')

// Only index.js calls this, so tests never pick up a real .env.
// A missing file is fine; values already in the environment win.
export function loadEnvFile() {
  dotenv.config({ path: ENV_PATH, quiet: true })
}

function toMaxCalls(value) {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isInteger(n) && n >= 0 ? n : DEFAULT_MAX_CALLS
}

// Builds the settings from a plain object (process.env in the real server).
export function buildAiConfig(env = {}) {
  const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : ''
  const requested = env.GEMINI_ENABLED === 'true'
  const config = {
    enabled: requested && apiKey !== '',
    model: (env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL,
    maxCalls: toMaxCalls(env.GEMINI_MAX_CALLS),
    warning:
      requested && !apiKey
        ? 'GEMINI_ENABLED is true but GEMINI_API_KEY is missing, so AI stays off'
        : null,
  }
  // Not enumerable, so the key can't end up in JSON or a logged object by accident.
  Object.defineProperty(config, 'apiKey', { value: apiKey, enumerable: false })
  return config
}

// One line for the startup log.
export function describeAi(config) {
  return config.enabled ? `AI: on (${config.model}, max ${config.maxCalls} calls)` : 'AI: off'
}
