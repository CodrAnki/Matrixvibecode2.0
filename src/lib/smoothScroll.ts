import Lenis from 'lenis'

let lenis: Lenis | null = null

/** Wheel/trackpad smoothing for the public site. Touch keeps native momentum (syncTouch off),
 *  and users who ask for reduced motion keep plain native scrolling. */
export function startSmoothScroll() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true })
}

export function stopSmoothScroll() {
  lenis?.destroy()
  lenis = null
}

/** Scroll a section to the top of the viewport. Sections above it that load data after mount
 *  (announcements, problems) can change height while the scroll is in flight, so on arrival it
 *  re-measures once and corrects if it landed off target. */
export function scrollToSection(el: HTMLElement) {
  if (!lenis) {
    el.scrollIntoView({ behavior: 'smooth' })
    return
  }
  lenis.scrollTo(el, {
    force: true,
    onComplete: () => {
      if (Math.abs(el.getBoundingClientRect().top) > 2) lenis?.scrollTo(el, { force: true, duration: 0.6 })
    },
  })
}

/** Programmatic scrolls must go through Lenis while it's running — writing scrollTop directly
 *  desyncs its internal position and it animates straight back to where it thought it was. */
export function scrollToTarget(target: HTMLElement | number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(target, { immediate, force: true })
    return
  }
  if (typeof target === 'number') {
    document.documentElement.scrollTop = target
    document.body.scrollTop = target
  } else {
    target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' })
  }
}
