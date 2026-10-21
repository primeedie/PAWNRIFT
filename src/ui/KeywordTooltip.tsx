import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { glossary, type Keyword } from '../data/glossary'
import { tooltipPosition } from './tooltipLayout'
import { keywordEvents, outsideTooltip, tooltipKeyboard } from './tooltipEvents'

type Topic = Keyword | 'guide'
type ActiveTooltip = { topic: Topic; trigger: HTMLButtonElement; id: string; extra?: string; pinned: boolean }
type TooltipAPI = {
  active?: ActiveTooltip
  open: (entry: Omit<ActiveTooltip, 'pinned'>, pinned?: boolean) => void
  leave: () => void
  keep: () => void
}
const TooltipContext = createContext<TooltipAPI | null>(null)

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTooltip>()
  const current = useRef(active)
  const panel = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suppressFocus = useRef<HTMLButtonElement | undefined>(undefined)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  const keep = () => clearTimeout(timer.current)
  const close = () => { keep(); current.current = undefined; setActive(undefined) }
  const open: TooltipAPI['open'] = (entry, pinned = false) => {
    keep()
    if (suppressFocus.current === entry.trigger) { suppressFocus.current = undefined; return }
    const next = { ...entry, pinned: pinned || (current.current?.trigger === entry.trigger && current.current.pinned) }
    current.current = next
    setActive(next)
  }
  const leave = () => {
    keep()
    timer.current = setTimeout(() => {
      const entry = current.current
      if (entry?.pinned || entry?.trigger === document.activeElement || panel.current?.contains(document.activeElement)) return
      close()
    }, 220)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  useLayoutEffect(() => {
    if (!active || !panel.current) return
    const place = () => {
      if (!active.trigger.isConnected) { close(); return }
      const viewport = window.visualViewport
      setPosition(tooltipPosition(active.trigger.getBoundingClientRect(), panel.current!.getBoundingClientRect(), {
        width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight,
      }))
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(panel.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [active])
  useEffect(() => {
    if (!active) return
    const outside = (event: PointerEvent) => {
      if (!outsideTooltip(event.target, active.trigger, panel.current)) return
      event.preventDefault()
      event.stopPropagation()
      close()
      // Swallow the resulting click too: dismissing help must not click the dungeon underneath.
      const swallow = (click: MouseEvent) => { click.preventDefault(); click.stopPropagation() }
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, true), 400)
    }
    const keyboard = (event: KeyboardEvent) => tooltipKeyboard(event, active.trigger, panel.current, () => {
        const returnFocus = panel.current?.contains(document.activeElement)
        close()
        if (returnFocus) { suppressFocus.current = active.trigger; active.trigger.focus() }
    })
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('keydown', keyboard, true)
    return () => {
      window.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('keydown', keyboard, true)
    }
  }, [active])
  return <TooltipContext.Provider value={{ active, open, leave, keep }}>
    {children}
    {active && createPortal(<div ref={panel} id={active.id} role="tooltip" tabIndex={0}
      className="keyword-tooltip" style={position} onPointerEnter={keep} onPointerLeave={leave}
      onFocus={keep} onBlur={leave} onClick={(event) => event.stopPropagation()}>
      {active.topic === 'guide' ? <><strong>Card guide</strong><dl>{Object.entries(glossary).map(([key, entry]) =>
        <div key={key}><dt>{entry.label}</dt><dd>{entry.explanation}</dd></div>)}</dl></>
        : <><strong>{glossary[active.topic].label}</strong><p>{glossary[active.topic].explanation}</p></>}
      {active.extra && <p className="tooltip-note">{active.extra}</p>}
      <small>Escape or click outside to close</small>
    </div>, document.body)}
  </TooltipContext.Provider>
}

export function KeywordTooltip({ topic, children, extra, className = '' }: {
  topic: Topic; children?: ReactNode; extra?: string; className?: string
}) {
  const api = useContext(TooltipContext)
  const id = useId()
  const show = (trigger: HTMLButtonElement, pinned = false) => api?.open({ topic, trigger, id, extra }, pinned)
  return <button type="button" className={`keyword ${className}`} data-keyword={topic}
    aria-label={topic === 'guide' ? 'Open card guide' : `Explain ${glossary[topic].label}${extra ? `. ${extra}` : ''}`}
    aria-describedby={api?.active?.id === id ? id : undefined}
    {...keywordEvents(show, () => api?.leave())}>
    {children ?? (topic === 'guide' ? '? Help' : glossary[topic].label)}
  </button>
}
