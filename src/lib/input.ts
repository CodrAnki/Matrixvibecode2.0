/** Shared, non-reactive input state read every frame by the 3D scene (no re-renders). */
export const input = { mx: 0, my: 0, scroll: 0 }

export function attachInput(): () => void {
  const onMove = (e: PointerEvent) => {
    input.mx = (e.clientX / window.innerWidth) * 2 - 1
    input.my = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight
    input.scroll = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }
}
