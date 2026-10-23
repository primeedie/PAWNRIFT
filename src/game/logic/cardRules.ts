import { cardBalance, cardDefinition } from '../../data/cards'
import type { GameState } from './combat'
import { cellId } from './dungeon'
import { hasLineOfSight } from './enemyAI'
import { canMove, isAdjacent, sameCell, type Cell } from './movement'
import { canSeeContent } from './visibility'
import { BOARD_SIZE } from '../../utils/grid'

export type CardTarget = { kind: 'self' } | { kind: 'enemy'; enemyId: string } | { kind: 'tile'; cell: Cell }

export function cardOptions(state: GameState, instanceId: string): { reason?: string; targets: CardTarget[] } {
  const instance = state.deck.hand.find((entry) => entry.instanceId === instanceId)
  if (!instance) return { reason: 'Card is not in hand', targets: [] }
  const card = cardDefinition(instance)
  if (state.status !== 'playing' || state.hp <= 0) return { reason: 'Run ended', targets: [] }
  if (state.energy < card.cost) return { reason: 'Not enough energy', targets: [] }
  const effect = card.effect
  if (effect.kind === 'damage') {
    const targets: CardTarget[] = state.enemies.filter((enemy) => enemy.hp > 0
      && isAdjacent(state.cell, enemy.cell) && canSeeContent(cellId(enemy.cell), state)
      && hasLineOfSight(state.dungeon, state.cell, enemy.cell)
      && !state.occupied.some((cell) => sameCell(cell, enemy.cell))
      && state.dungeon.tiles.some((tile) => sameCell(tile, enemy.cell) && !tile.blocksMovement))
      .map((enemy) => ({ kind: 'enemy', enemyId: enemy.id }))
    return { targets, reason: targets.length ? undefined : 'No adjacent visible foe' }
  }
  if (effect.kind === 'move') {
    const board = { available: state.dungeon.tiles, blocked: state.dungeon.tiles.filter((tile) => tile.blocksMovement),
      occupied: [...state.occupied, ...state.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.cell)], size: BOARD_SIZE }
    const targets: CardTarget[] = state.dungeon.tiles.filter((tile) => canSeeContent(cellId(tile), state)
      && canMove(state.cell, tile, board)).map((cell) => ({ kind: 'tile', cell: { column: cell.column, row: cell.row } }))
    return { targets, reason: targets.length ? undefined : 'No clear adjacent tile' }
  }
  if (effect.kind === 'heal' && state.hp >= state.maxHp) return { reason: 'HP already full', targets: [] }
  if (effect.kind === 'focus' && state.focus >= cardBalance.maxFocus) return { reason: 'Focus already full', targets: [] }
  return { targets: [{ kind: 'self' }] }
}

export function validCardTarget(state: GameState, instanceId: string, target: CardTarget) {
  return cardOptions(state, instanceId).targets.some((candidate) => candidate.kind === target.kind
    && (candidate.kind === 'self' || (candidate.kind === 'enemy' && target.kind === 'enemy' && candidate.enemyId === target.enemyId)
      || (candidate.kind === 'tile' && target.kind === 'tile' && sameCell(candidate.cell, target.cell))))
}
