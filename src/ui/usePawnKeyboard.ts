import { useEffect } from 'react'
import { type Direction } from '../game/logic/movement'
import { formKeyDestination } from '../game/logic/chessMovement'
import { currentForm } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { closeHudPanels, gameplayBlocked } from './hudInteraction'
import { useInspectionStore } from './inspectionStore'
import { contextAction, cancelExit, useInteractionStore } from './interactionStore'

const directions: Record<string, Direction | undefined> = {
  w: 'north', arrowup: 'north', d: 'east', arrowright: 'east',
  s: 'south', arrowdown: 'south', a: 'west', arrowleft: 'west',
}

export function onPawnKeyDown(event: KeyboardEvent) {
      if(event.defaultPrevented)return
      const target = event.target
      if (event.ctrlKey || event.metaKey || event.altKey
        || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return
      const direction = directions[event.key.toLowerCase()]
      const key = event.key.toLowerCase()
      if (!direction && !['e', 'q', ' ', '.', 'escape'].includes(key)) return
      if (key === ' ' && target instanceof HTMLElement && target.closest('button, summary')) return
      event.preventDefault()
      if (event.repeat) return // One keypress = one tile; no queued moves.
      const state = usePawnStore.getState()
      if (key === 'escape') {
        if(useInteractionStore.getState().pending){cancelExit();return}
        const ui=useInspectionStore.getState()
        if(state.tutorial&&!gameplayBlocked()&&!state.selectedCardId&&!state.selectedAbility&&!ui.aimingAttack&&!ui.characterOpen&&!ui.enemyId)state.requestTutorialExit(true)
        else {ui.dismiss();state.selectCard(undefined);closeHudPanels()}
      }
      else if (gameplayBlocked()) state.recordInputBlocked()
      else if (direction) state.tryMove(formKeyDestination(currentForm(state.transformations), state.cell, direction, event.shiftKey))
      else if (key === 'e') contextAction()
      else state.submitAction({ kind: key === 'q' ? 'defend' : 'wait' })
}
export function usePawnKeyboard() {
  useEffect(() => {
    window.addEventListener('keydown', onPawnKeyDown)
    return () => window.removeEventListener('keydown', onPawnKeyDown)
  }, [])
}
