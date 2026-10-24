import { useEffect } from 'react'

const STARTUP_SOUND = '/sounds/Startup.mp3'

// Module-level so StrictMode's double effect run doesn't play it twice.
// Shared by playStartupSound and the hook, so the sound plays at most once.
let played = false

// Plays the startup sound right now. Call it from a click or key handler,
// since browsers only allow audio that starts from a user gesture.
export function playStartupSound() {
  if (played) return
  played = true
  new Audio(STARTUP_SOUND).play().catch(() => {})
}

// Plays the startup sound once per page load. Browsers block audio until the
// user has interacted with the page, so if autoplay is refused it plays on
// the first click or key press instead. Does nothing while enabled is false
// (the boot screen plays the sound itself).
export default function useStartupSound({ enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || played) return
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
  }, [enabled])
}
