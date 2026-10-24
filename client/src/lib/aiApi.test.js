import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { AiRequestError, fetchAiConfig, fetchSummary } from './aiApi.js'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

// Replaces fetch with one that records calls and returns the given response.
function stubFetch(respond) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return respond(url, options)
  }
  return calls
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const ID = 'a'.repeat(40)

test('fetchAiConfig reads ai.enabled and model from /api/health', async () => {
  const calls = stubFetch(() =>
    json(200, { status: 'ok', repo: '/x', ai: { enabled: true, model: 'm', callsUsed: 0, maxCalls: 30 } }),
  )
  assert.deepEqual(await fetchAiConfig(), { enabled: true, model: 'm' })
  assert.equal(calls[0].url, '/api/health')
})

test('fetchAiConfig falls back to disabled on any failure', async () => {
  const cases = [
    () => { throw new TypeError('Failed to fetch') },
    () => new Response('Bad gateway', { status: 502 }),
    () => new Response('<html>', { status: 200 }),
    () => json(200, { status: 'ok' }),
    () => json(200, { ai: { enabled: 'true' } }),
  ]
  for (const respond of cases) {
    stubFetch(respond)
    assert.equal((await fetchAiConfig()).enabled, false)
  }
})

test('fetchSummary posts the id and returns the summary', async () => {
  const calls = stubFetch(() => json(200, { summary: 'Adds the parser.' }))
  assert.equal(await fetchSummary(ID), 'Adds the parser.')
  assert.equal(calls[0].url, '/api/summary')
  assert.equal(calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].options.body), { id: ID })
})

test('fetchSummary turns error responses into AiRequestError', async () => {
  const cases = [
    [503, { error: 'AI is switched off', details: 'Set GEMINI_ENABLED=true' }],
    [429, { error: 'AI call limit reached', details: 'Used 30 of 30 calls.' }],
    [502, { error: 'Quota exceeded', details: 'Gemini responded 429' }],
    [404, { error: 'Commit not found', details: ID }],
  ]
  for (const [status, body] of cases) {
    stubFetch(() => json(status, body))
    await assert.rejects(fetchSummary(ID), (err) => {
      assert.ok(err instanceof AiRequestError)
      assert.equal(err.status, status)
      assert.equal(err.message, body.error)
      assert.equal(err.details, body.details)
      return true
    })
  }
})

test('fetchSummary handles error responses that are not JSON', async () => {
  stubFetch(() => new Response('', { status: 502 }))
  await assert.rejects(fetchSummary(ID), { name: 'AiRequestError', status: 502, message: 'Request failed (502)' })
})

test('fetchSummary rejects an empty summary', async () => {
  stubFetch(() => json(200, { summary: '   ' }))
  await assert.rejects(fetchSummary(ID), { name: 'AiRequestError' })
})
