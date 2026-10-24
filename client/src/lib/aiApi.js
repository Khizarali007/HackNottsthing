// Requests to our own server for the AI features. Relative URLs so they go
// through the Vite proxy; the browser never talks to Gemini directly.

export class AiRequestError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'AiRequestError'
    this.status = status
    this.details = details
  }
}

// Returns { enabled, model }. Any failure counts as AI being off.
export async function fetchAiConfig(signal) {
  try {
    const res = await fetch('/api/health', { signal })
    if (!res.ok) return { enabled: false }
    const ai = (await res.json())?.ai
    return {
      enabled: ai?.enabled === true,
      model: typeof ai?.model === 'string' ? ai.model : undefined,
    }
  } catch {
    return { enabled: false }
  }
}

// Returns the summary text, or throws AiRequestError for an error response.
export async function fetchSummary(id, signal) {
  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
    signal,
  })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new AiRequestError(
      typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`,
      res.status,
      typeof body?.details === 'string' ? body.details : undefined,
    )
  }
  if (typeof body?.summary !== 'string' || !body.summary.trim()) {
    throw new AiRequestError('Server sent an empty summary', res.status)
  }
  return body.summary
}
