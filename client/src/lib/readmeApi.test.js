import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchReadme } from './readmeApi.js'

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

test('the default repo asks /api/readme with no query string', async () => {
  const calls = stubFetch(() => json(200, { name: 'README.md', content: '# Hi\n', truncated: false }))
  assert.deepEqual(await fetchReadme(null), { name: 'README.md', content: '# Hi\n', truncated: false })
  assert.equal(calls[0].url, '/api/readme')
})

test('a picked repo is sent URL-encoded as ?repo=', async () => {
  const calls = stubFetch(() => json(200, { name: 'README.md', content: 'x', truncated: true }))
  const readme = await fetchReadme('https://github.com/owner/repo')
  assert.equal(calls[0].url, '/api/readme?repo=https%3A%2F%2Fgithub.com%2Fowner%2Frepo')
  assert.equal(readme.truncated, true)
})

test('a repo without a readme comes back with name null', async () => {
  stubFetch(() => json(200, { name: null, content: '', truncated: false }))
  assert.deepEqual(await fetchReadme(null), { name: null, content: '', truncated: false })
})

test('an error answer throws its message', async () => {
  stubFetch(() => json(400, { error: 'Only https://github.com/owner/repo URLs are supported.', details: '' }))
  await assert.rejects(fetchReadme('https://example.com/a/b'), {
    message: 'Only https://github.com/owner/repo URLs are supported.',
  })
})

test('a network failure, a non-JSON answer and an answer without content all throw', async () => {
  const cases = [
    () => { throw new TypeError('Failed to fetch') },
    () => new Response('<html>', { status: 200 }),
    () => json(200, { name: 'README.md' }),
  ]
  for (const respond of cases) {
    stubFetch(respond)
    await assert.rejects(fetchReadme(null))
  }
})
