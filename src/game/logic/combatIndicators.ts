import type { CombatEvent, GameState } from './combat'
import { cellId } from './dungeon'
import { canSeeContent } from './visibility'

export function combatIndicator(event: CombatEvent) {
  if (!event.seen) return null
  if (event.kind === 'stun') return { text: 'STUN', tone: 'blocked' }
  if (event.kind === 'parry') return { text: 'PARRIED', tone: 'blocked' }
  if (event.kind === 'heal' && (event.amount ?? 0) > 0) return { text: `+${event.amount}`, tone: 'heal' }
  if (event.kind === 'hit' || event.kind === 'counter') return {
    text: event.effect ? `${event.effect === 'sharpener' ? 'Iai' : event.effect === 'pierce' && event.penetrated ? `Pierce (${event.penetrated} DEF)` : event.effect} ${event.amount ? `−${event.amount}` : 'BLOCKED'}${event.blocked ? ` (${event.blocked} Block)` : ''}` : event.amount ? `−${event.amount}` : 'BLOCKED', tone: event.amount ? 'damage' : 'blocked',
  }
  return null
}

// Shared presentation boundary: neither map debug nor remembered terrain reveals entities or HP.
export function visibleEnemies(state: GameState) {
  return state.enemies.filter((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state))
}
