import { useEffect } from 'react'
import { adjacentCell, type Direction } from '../game/logic/movement'
import { usePawnStore } from '../game/state/pawnStore'

const directions: Record<string, Direction | undefined> = {
  w: 'north', arrowup: 'north', d: 'east', arrowright: 'east',
  s: 'south', arrowdown: 'south', a: 'west', arrowleft: 'west',
}

export function usePawnKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (event.ctrlKey || event.metaKey || event.altKey
        || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return
      const direction = directions[event.key.toLowerCase()]
      const key = event.key.toLowerCase()
      if (!direction && !['e', 'q', ' ', '.'].includes(key)) return
      if (key === ' ' && target instanceof HTMLElement && target.closest('button, summary')) return
      event.preventDefault()
      if (event.repeat) return // One keypress = one tile; no queued moves.
      const state = usePawnStore.getState()
      if (direction) state.tryMove(adjacentCell(state.cell, direction))
      else if (key === 'e') state.tryAttack()
      else state.submitAction({ kind: key === 'q' ? 'defend' : 'wait' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
