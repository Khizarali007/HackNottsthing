// Starts the API server that serves git history to the client.
import path from 'node:path'
import { createApp } from './app.js'
import { buildAiConfig, describeAi, loadEnvFile } from './ai/config.js'
import { createAi } from './ai/index.js'

loadEnvFile()

const PORT = Number(process.env.PORT) || 3001

// --repo <path> wins over REPO_PATH, which wins over the current directory.
function resolveRepoPath(argv) {
  const flag = argv.indexOf('--repo')
  const fromArg = flag !== -1 ? argv[flag + 1] : undefined
  return path.resolve(fromArg || process.env.REPO_PATH || process.cwd())
}

const REPO_PATH = resolveRepoPath(process.argv.slice(2))

const aiConfig = buildAiConfig(process.env)
if (aiConfig.warning) console.warn(`Warning: ${aiConfig.warning}`)

const app = createApp({ repoPath: REPO_PATH, ai: createAi(aiConfig) })

app.listen(PORT, () => {
  console.log(`Reading git history from ${REPO_PATH}`)
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log(describeAi(aiConfig))
})
