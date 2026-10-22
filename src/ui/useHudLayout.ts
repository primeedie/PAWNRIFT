import { useLayoutEffect, type RefObject } from 'react'
import { restoreAfterPanelClose, restoreGameFocus } from './hudInteraction'

export function useHudLayout(screen: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = screen.current
    if (!root || !enabled) return
    const header = root.querySelector<HTMLElement>('.scene-header')!, footer = root.querySelector<HTMLElement>('.scene-footer')!
    const hand = root.querySelector<HTMLElement>('.card-hand')!
    const measure = () => {
      root.style.setProperty('--hud-header-height', `${header.offsetHeight}px`)
      root.style.setProperty('--hud-footer-height', `${getComputedStyle(footer).position === 'absolute' ? 0 : footer.offsetHeight}px`)
      root.style.setProperty('--hand-height', `${Math.ceil(hand.offsetHeight) + 12}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header); observer.observe(footer); observer.observe(hand)
    const toggle = (event: Event) => {
      if (event.target instanceof HTMLDetailsElement && event.target.name === 'hud-panels')
        restoreAfterPanelClose(event.target, document.activeElement, restoreGameFocus)
    }
    root.addEventListener('toggle', toggle, true)
    return () => { observer.disconnect(); root.removeEventListener('toggle', toggle, true) }
  }, [screen, enabled])
}
