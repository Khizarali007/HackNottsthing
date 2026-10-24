// First 7 characters of a commit hash, like git's short form.
export function shortId(id) {
  return String(id ?? '').slice(0, 7)
}
