import { formBalance } from '../../data/forms'
import type { GameState } from './combat'
import { currentForm } from './transformations'
import { cellId } from './dungeon'
import { hasLineOfSight } from './enemyAI'
import { sameCell } from './movement'
import { canSeeContent } from './visibility'
import { chessDestinations } from './chessMovement'
import { BOARD_SIZE } from '../../utils/grid'

export function formAttackTargets(state: GameState, signature = false) {
  const form = currentForm(state.transformations)
  if (form === 'pawn' || (signature && form === 'bishop')) return []
  const range = signature && form === 'rook' ? formBalance.rook.abilityRange : formBalance[form].attackRange
  return state.enemies.filter((enemy) => {
    if (enemy.hp <= 0 || !canSeeContent(cellId(enemy.cell), state)) return false
    const dx = enemy.cell.column - state.cell.column, dy = enemy.cell.row - state.cell.row
    const x = Math.abs(dx), y = Math.abs(dy), distance = Math.max(x, y)
    const line = form === 'bishop' ? x === y && x > 0 : form === 'queen' ? distance === 1 : (x === 0) !== (y === 0)
    if (!line || distance > range || !hasLineOfSight(state.dungeon, state.cell, enemy.cell)) return false
    for (let step = 1; step <= distance; step++) {
      const cell = { column: state.cell.column + Math.sign(dx) * step, row: state.cell.row + Math.sign(dy) * step }
      if (!state.dungeon.tiles.some((tile) => sameCell(tile, cell) && !tile.blocksMovement)
        || state.occupied.some((other) => sameCell(other, cell))
        || (step < distance && state.enemies.some((other) => other.hp > 0 && sameCell(other.cell, cell)))) return false
    }
    return true
  })
}
export function abilityReason(state: GameState) {
  const active = state.transformations.active
  if (state.status !== 'playing' || state.hp <= 0) return 'Run ended.'
  if (!active) return 'Transform first; Pawn uses Defend to parry.'
  if (state.energy < formBalance[active.form].abilityCost) return 'Not enough Energy.'
  if (active.form !== 'bishop' && !formAttackTargets(state, true).length) return 'No visible target in range.'
}

// Preview uses only known terrain and currently visible occupants. Unscouted outlines are attempts,
// not promises: their appearance must never depend on an unseen wall or enemy.
export function movementPreviews(state: GameState) {
  const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, id) => ({ column: id % BOARD_SIZE, row: Math.floor(id / BOARD_SIZE) }))
  const knownBoard = { size: BOARD_SIZE, available: cells,
    blocked: state.dungeon.tiles.filter((tile) => state.explored.has(cellId(tile)) && tile.blocksMovement),
    occupied: [...state.occupied.filter((cell) => canSeeContent(cellId(cell), state)),
      ...state.enemies.filter((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state)).map((enemy) => enemy.cell)] }
  return chessDestinations(currentForm(state.transformations), state.cell, knownBoard)
    .map((cell) => ({ ...cell, uncertain: !canSeeContent(cellId(cell), state) }))
}
