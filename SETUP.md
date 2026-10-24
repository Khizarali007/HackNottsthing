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

## Ports

| Service | URL                   |
| ------- | --------------------- |
| Client  | http://localhost:5173 |
| Server  | http://localhost:3001 |

The server allows CORS from `http://localhost:5173`.

## Build

```bash
cd client
npm run build
```

## API Contract

### `GET /api/health`

Returns `{ "status": "ok" }`.

### `GET /api/history`

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
