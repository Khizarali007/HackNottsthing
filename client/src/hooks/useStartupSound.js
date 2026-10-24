import { useEffect } from 'react'

const STARTUP_SOUND = '/sounds/Startup.mp3'

// Module-level so StrictMode's double effect run doesn't play it twice.
let played = false

// Plays the startup sound once per page load. Browsers block audio until the
// user has interacted with the page, so if autoplay is refused it plays on
// the first click or key press instead.
export default function useStartupSound() {
  useEffect(() => {
    if (played) return
    played = true

    const audio = new Audio(STARTUP_SOUND)
    const events = ['pointerdown', 'keydown']
    const playOnInteraction = () => {
      events.forEach((e) => window.removeEventListener(e, playOnInteraction))
      audio.play().catch(() => {})
    }

    audio.play().catch(() => {
      events.forEach((e) => window.addEventListener(e, playOnInteraction))
    })
  }, [])
}
