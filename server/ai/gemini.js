// Thin wrapper around the Gemini SDK. The SDK is only loaded on the first
// real call, so the server starts fine without a key.

const TIMEOUT_MS = 20000

// `status` is what our API answers with. `upstreamStatus` is Gemini's own
// HTTP status, used to decide whether a retry makes sense.
export class AiError extends Error {
  constructor(message, status, { details = '', upstreamStatus } = {}) {
    super(message)
    this.name = 'AiError'
    this.status = status
    this.details = details
    this.upstreamStatus = upstreamStatus
  }
}

// Short fixed messages only. SDK error text is never passed on, so the key
// or the request can't leak through it.
function toAiError(err) {
  if (err instanceof AiError) return err
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return new AiError('Gemini took too long to answer', 502, { details: `No answer after ${TIMEOUT_MS / 1000} seconds` })
  }

  const status = typeof err?.status === 'number' ? err.status : undefined
  const details = status ? `Gemini responded ${status}` : 'Could not reach Gemini'
  const keyProblem = status === 401 || status === 403 || (status === 400 && /api key/i.test(err?.message ?? ''))

  let message = 'Gemini request failed'
  if (keyProblem) message = 'API key rejected'
  else if (status === 404) message = 'Model not found, check GEMINI_MODEL'
  else if (status === 429) message = 'Quota exceeded'
  else if (status === 500 || status === 503) message = 'Gemini is unavailable right now'

  return new AiError(message, 502, { details, upstreamStatus: status })
}

export function createGeminiClient({ apiKey, model }) {
  let aiPromise = null

  function getAi() {
    aiPromise ??= import('@google/genai')
      .then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey }))
      .catch((err) => {
        aiPromise = null
        throw err
      })
    return aiPromise
  }

  return {
    async generate({ prompt }) {
      let response
      try {
        const ai = await getAi()
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 200,
            abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          },
        })
      } catch (err) {
        throw toAiError(err)
      }

      const text = response?.text
      if (typeof text !== 'string' || !text.trim()) {
        throw new AiError('Gemini returned an empty answer', 502)
      }
      return text
    },
  }
}
