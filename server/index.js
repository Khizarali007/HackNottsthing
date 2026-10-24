// Express API server that serves git history to the client.
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/history', (req, res) => {
  res.json([])
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
