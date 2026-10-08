// Tiny pub/sub so the trigger (the navbar logo) and the toast (DevCredits, mounted once at the
// app root) don't need to share a component tree. A plain window event does the job.
const EVENT = 'matrix:easter-egg'

export function triggerEasterEgg() {
  window.dispatchEvent(new Event(EVENT))
}

export function onEasterEgg(cb: () => void) {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}
