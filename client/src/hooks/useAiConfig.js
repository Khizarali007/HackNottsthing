import { useEffect, useState } from 'react'
import { fetchAiConfig } from '../lib/aiApi.js'

// Asks the server once whether AI features are switched on.
// `ready` stays false until it answers; a failed request counts as off.
export default function useAiConfig() {
  const [config, setConfig] = useState({ ready: false, enabled: false, model: null })

  useEffect(() => {
    const controller = new AbortController()
    fetchAiConfig(controller.signal).then(({ enabled, model }) => {
      if (controller.signal.aborted) return
      setConfig({ ready: true, enabled, model: model ?? null })
    })
    return () => controller.abort()
  }, [])

  return config
}
