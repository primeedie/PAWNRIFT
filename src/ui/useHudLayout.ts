import { useLayoutEffect, type RefObject } from 'react'

export function useHudLayout(screen: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = screen.current
    if (!root || !enabled) return
    const header = root.querySelector<HTMLElement>('.scene-header')!, footer = root.querySelector<HTMLElement>('.scene-footer')!
    const measure = () => {
      root.style.setProperty('--hud-header-height', `${header.offsetHeight}px`)
      root.style.setProperty('--hud-footer-height', `${footer.offsetHeight}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header); observer.observe(footer)
    return () => observer.disconnect()
  }, [screen, enabled])
}
