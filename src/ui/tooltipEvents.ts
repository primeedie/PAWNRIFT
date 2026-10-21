import type { FocusEvent, MouseEvent, PointerEvent } from 'react'

// Presentation-only event handlers; no game state or commands are available here.
export function keywordEvents(show: (trigger: HTMLButtonElement, pinned?: boolean) => void, leave: () => void) {
  return {
    onPointerEnter: (event: Pick<PointerEvent<HTMLButtonElement>, 'pointerType' | 'currentTarget'>) => { if (event.pointerType !== 'touch') show(event.currentTarget) },
    onPointerLeave: leave,
    onFocus: (event: Pick<FocusEvent<HTMLButtonElement>, 'currentTarget'>) => show(event.currentTarget),
    onBlur: leave,
    onPointerDown: (event: Pick<PointerEvent<HTMLButtonElement>, 'stopPropagation'>) => event.stopPropagation(),
    onClick: (event: Pick<MouseEvent<HTMLButtonElement>, 'currentTarget' | 'stopPropagation'>) => { event.stopPropagation(); show(event.currentTarget, true) },
  }
}

type Contains = { contains: (target: Node | null) => boolean }
export function tooltipKeyboard(event: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault' | 'stopPropagation'>,
  trigger: Contains, panel: Contains | null, dismiss: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    dismiss()
  } else if (panel?.contains(event.target as Node) || trigger.contains(event.target as Node)) {
    event.stopPropagation()
  }
}

export function outsideTooltip(target: EventTarget | null, trigger: Contains, panel: Contains | null) {
  return !panel?.contains(target as Node) && !trigger.contains(target as Node)
    && !(target as Element | null)?.closest?.('.keyword')
}
