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

## API Contract

### `GET /api/health`

Returns `{ "status": "ok", "repo": "<path being read>" }`.

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
