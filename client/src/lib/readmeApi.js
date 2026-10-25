// Asks our server for the readme of the repo being shown.
// repoUrl is null for the server's default repo, otherwise a GitHub URL.
// Returns { name, content, truncated }; name is null when the repo has no readme.
export async function fetchReadme(repoUrl, signal) {
  const url = repoUrl ? `/api/readme?repo=${encodeURIComponent(repoUrl)}` : '/api/readme'
  const res = await fetch(url, { signal })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`)
  }
  if (typeof body?.content !== 'string') {
    throw new Error('Server sent an unexpected answer')
  }
  return {
    name: typeof body.name === 'string' ? body.name : null,
    content: body.content,
    truncated: body.truncated === true,
  }
}
