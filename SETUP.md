# GitStory Setup

## Requirements

- Node.js 20+ and npm

## Install

From the repo root:

```bash
npm run install:all
```

This installs dependencies for the root, `client/` and `server/`.

## Run

```bash
npm run dev
```

Runs the client and server together. To run them separately:

```bash
npm run dev:client
npm run dev:server
```

## Choosing the repository

The server reads the history of one git repository. It picks the path in this order:

1. The `--repo <path>` argument
2. The `REPO_PATH` environment variable
3. The directory the server was started from

Examples:

```bash
# Git Bash / macOS
REPO_PATH=/path/to/some/repo npm run dev:server

# PowerShell
$env:REPO_PATH = "C:\path\to\some\repo"; npm run dev:server

# Any shell, running the server directly
node server/index.js --repo /path/to/some/repo
```

`npm run dev` from the repo root starts the server inside `server/`, so with no path set it shows this project's own history.

The server prints the repository path and port when it starts.

## Ports

| Service | URL                   |
| ------- | --------------------- |
| Client  | http://localhost:5173 |
| Server  | http://localhost:3001 |

The server port can be changed with the `PORT` environment variable.

The server allows CORS from `http://localhost:5173` and `http://127.0.0.1:5173`.

## Tests

```bash
npm test --prefix server
```

## Build

```bash
cd client
npm run build
```

## AI features

The server can write a short plain-English summary of a single commit using Google Gemini. It is **off by default**, so no API credits are used unless you turn it on. Commit categories (Bugfix, Feature and so on) are separate: they run in the browser and don't need a key.

### Setup

Copy the example settings file:

```bash
# Git Bash / macOS
cp server/.env.example server/.env
```

```powershell
# PowerShell
Copy-Item server\.env.example server\.env
```

Open `server/.env` and paste your Gemini API key after `GEMINI_API_KEY=`. The key stays on the server: it is never sent to the browser, never logged, and `server/.env` is ignored by git. Never put the key anywhere else in the repo, because the repository is public.

### Settings

| Setting            | Default                 | What it does                                                        |
| ------------------ | ----------------------- | ------------------------------------------------------------------- |
| `GEMINI_API_KEY`   | none                    | Your Gemini API key                                                 |
| `GEMINI_ENABLED`   | `false`                 | Only the exact value `true` turns summaries on                      |
| `GEMINI_MODEL`     | `gemini-3.5-flash-lite` | Which Gemini model to use                                           |
| `GEMINI_MAX_CALLS` | `30`                    | Most real Gemini calls allowed per server run (failed calls count too) |

Summaries only turn on when `GEMINI_ENABLED=true` **and** a key is set. If it's `true` but the key is missing, the server prints a warning and keeps AI off.

**Restart the server after changing `server/.env`.** On startup it prints `AI: off` or `AI: on (model, max N calls)`.

### Call cap and cache

- Every real call to Gemini counts toward `GEMINI_MAX_CALLS`. When the limit is reached, summary requests get a `429` until the server is restarted.
- A request that fails because Gemini is busy (429 or 503) is retried once after 2 seconds. The retry also counts.
- Each call is logged as one line, e.g. `[ai] summary call 3/30 1240ms`. Commit text and the key are never logged.
- Summaries are cached by commit, so asking again for the same commit doesn't use a call. The cache is saved to `gitstory-ai-cache.json` in your system's temp folder, so it survives restarts. Delete that file to clear it.

## API Contract

### `GET /api/health`

Returns:

```json
{
  "status": "ok",
  "repo": "<path being read>",
  "ai": { "enabled": false, "model": "gemini-3.5-flash-lite", "callsUsed": 0, "maxCalls": 30 }
}
```

### `GET /api/history`

Optional query parameter:

- `limit`: only return the newest N commits, e.g. `/api/history?limit=200`. Must be a positive whole number. Values above 5000 are treated as 5000.

Commits from every branch are included, newest first (parents always come after their children).

Returns a flat JSON array of commits:

```json
[
  {
    "id": "string",
    "parents": ["string"],
    "author": "string",
    "date": "string",
    "message": "string",
    "linesAdded": 0,
    "linesDeleted": 0,
    "aiCategory": null
  }
]
```

`aiCategory` is always `null` from the server. It is filled in later by the browser worker.

- `id` and `parents` are full 40-character hashes.
- `parents` is `[]` for the first commit and has two or more entries for merges.
- `date` is the author date in ISO 8601 format.
- Merge commits report `0` added and `0` deleted lines. Binary files count as `0`.
- A repository with no commits yet returns `[]`.

### `POST /api/summary`

Writes a short summary of one commit. Needs AI to be switched on (see [AI features](#ai-features)).

Request body:

```json
{ "id": "<full 40-character commit hash>" }
```

Response:

```json
{ "summary": "Two or three plain sentences about the commit." }
```

The summary is based only on what git reports for that commit: the message, author, date, number of parents and the names of up to 25 changed files with their line counts. No file contents are sent to Gemini.

| Status | When                                                    |
| ------ | ------------------------------------------------------- |
| 400    | Missing or invalid `id`, or the body isn't valid JSON   |
| 404    | No commit with that hash in the repository              |
| 429    | The `GEMINI_MAX_CALLS` limit has been reached           |
| 502    | The request to Gemini failed (bad key, wrong model, quota, timeout) |
| 503    | AI is switched off                                      |

### Errors

Errors are returned as JSON:

```json
{ "error": "Path is not a git repository", "details": "/path/that/was/used" }
```

| Status | When                                                              |
| ------ | ----------------------------------------------------------------- |
| 400    | The repository path doesn't exist or isn't a git repository       |
| 400    | `limit` isn't a positive whole number                             |
| 500    | Git isn't installed, or git failed while reading the history      |

`POST /api/summary` has its own statuses, listed in its section above.
