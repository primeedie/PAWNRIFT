import { create } from 'zustand'
import { usePawnStore } from '../game/state/pawnStore'
import type { GameState } from '../game/logic/combat'
import { attackTargets } from '../game/logic/combat'
import { cellId } from '../game/logic/dungeon'
import { canSeeContent } from '../game/logic/visibility'
import { royalDecreeTargets } from '../game/logic/signatures'
import { gridDistance } from '../game/logic/enemyAI'
import { abilityBalance } from '../data/abilities'

export const useInspectionStore = create<{
  characterOpen: boolean; enemyId?: string; aimingAttack: boolean; lastPanel: 'character' | 'enemy'
  toggleCharacter: () => void; toggleEnemy: (id: string) => void; closeCharacter: () => void; closeEnemy: () => void; dismiss: () => void
}>((set) => ({
  characterOpen: false, aimingAttack: false, lastPanel: 'character',
  toggleCharacter: () => {set(s => ({ characterOpen: !s.characterOpen, lastPanel: s.characterOpen && s.enemyId ? 'enemy' : 'character' }));
    if(useInspectionStore.getState().characterOpen)usePawnStore.getState().observeTutorialUI({kind:'character-inspected'})},
  toggleEnemy: id => {set(s => ({ enemyId: s.enemyId === id ? undefined : id, lastPanel: s.enemyId === id && s.characterOpen ? 'character' : 'enemy' }));
    if(useInspectionStore.getState().enemyId===id)usePawnStore.getState().observeTutorialUI({kind:'enemy-inspected',id})},
  closeCharacter: () => set({ characterOpen: false, lastPanel: 'enemy' }),
  closeEnemy: () => set({ enemyId: undefined, lastPanel: 'character' }),
  dismiss: () => set({ characterOpen: false, enemyId: undefined, aimingAttack: false }),
}))

export function inspectedEnemy(state: GameState, id?: string) {
  return state.enemies.find(enemy => enemy.id === id && enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state))
}

// Presentation lifecycle only: the real run/snapshot/resolver never owns inspection state.
export function connectInspection() {
  return usePawnStore.subscribe((state, previous) => {
    const ui = useInspectionStore.getState()
    if (state.dungeon !== previous.dungeon || state.training?.id !== previous.training?.id || !state.runActive || state.hp <= 0) {
      ui.dismiss(); return
    }
    if (ui.enemyId && !inspectedEnemy(state, ui.enemyId)) ui.closeEnemy()
    if (ui.aimingAttack && (state.phase !== 'ready' || state.status !== 'playing' || state.selectedCardId || state.selectedAbility))
      useInspectionStore.setState({ aimingAttack: false })
  })
}

export function fitInspectionPanels(width: number) {
  const ui=useInspectionStore.getState()
  if(width<1200 && ui.characterOpen && ui.enemyId) {
    if(ui.lastPanel==='character')ui.closeEnemy();else ui.closeCharacter()
  }
}

export function aimBasicAttack() {
  const state = usePawnStore.getState(), ui = useInspectionStore.getState()
  if (!state.runActive || state.phase !== 'ready' || state.status !== 'playing' || !attackTargets(state).length) return false
  state.selectCard(undefined)
  useInspectionStore.setState({ aimingAttack: !ui.aimingAttack, characterOpen: false, enemyId: undefined })
  return true
}

export function clickEnemy(id: string): 'inspect' | 'action' | 'invalid' {
  const state = usePawnStore.getState(), ui = useInspectionStore.getState()
  if (!state.runActive || state.hp <= 0 || !inspectedEnemy(state, id)) return 'invalid'
  let accepted: boolean
  if (state.selectedCardId) accepted = state.playSelectedCard({ kind: 'enemy', enemyId: id })
  else if (state.selectedAbility) {
    const form = state.transformations.active?.form
    accepted = form === 'knight' ? state.tryAbility(id)
      : form === 'king' && royalDecreeTargets(state).some(enemy => enemy.id === id) ? state.tryAbility()
        : form === 'queen' && gridDistance(state.cell, inspectedEnemy(state,id)!.cell) <= abilityBalance.fearRange ? state.tryAbility() : false
  } else if (ui.aimingAttack) accepted = state.tryAttack(id)
  else { ui.toggleEnemy(id); return 'inspect' }
  if (accepted) useInspectionStore.setState({ aimingAttack: false })
  return accepted ? 'action' : 'invalid'
}

// The first ordinary board click dismisses inspection; it cannot also move the Pawn.
export function consumeInspectionBoardClick() {
  const state = usePawnStore.getState(), ui = useInspectionStore.getState()
  if (state.selectedCardId || state.selectedAbility) return false
  if (ui.aimingAttack) return true // an empty tile is not a basic attack target
  if (!ui.characterOpen && !ui.enemyId) return false
  ui.dismiss(); return true
}
