import { formBalance, type ChessForm } from '../../data/forms'
import type { GameState } from './combat'
import { currentForm } from './transformations'
import { cellId } from './dungeon'
import { hasLineOfSight } from './enemyAI'
import { isAdjacent, sameCell, type Cell } from './movement'
import { canSeeContent } from './visibility'
import { chessDestinations } from './chessMovement'
import { BOARD_SIZE } from '../../utils/grid'
import { perchTiles } from './perching'

export function basicAttackPattern(form: ChessForm, from: Cell, to: Cell) {
  const x = Math.abs(to.column - from.column), y = Math.abs(to.row - from.row)
  const range = form === 'pawn' ? 1 : formBalance[form].attackRange
  if (form === 'bishop') return (((x === 0) !== (y === 0)) && Math.max(x, y) <= range) || isAdjacent(from, to)
  return Math.max(x, y) <= range && (form === 'pawn' || form === 'rook' || form === 'knight'
    ? (x === 0) !== (y === 0) : isAdjacent(from, to))
}

export function formAttackTargets(state: GameState) {
  const form = currentForm(state.transformations)
  return state.enemies.filter((enemy) => {
    if (enemy.hp <= 0 || !canSeeContent(cellId(enemy.cell), state)) return false
    const dx = enemy.cell.column - state.cell.column, dy = enemy.cell.row - state.cell.row
    const x = Math.abs(dx), y = Math.abs(dy), distance = Math.max(x, y)
    if (!basicAttackPattern(form, state.cell, enemy.cell) || !hasLineOfSight(state.dungeon, state.cell, enemy.cell)) return false
    for (let step = 1; step <= distance; step++) {
      const cell = { column: state.cell.column + Math.sign(dx) * step, row: state.cell.row + Math.sign(dy) * step }
      if (!state.dungeon.tiles.some((tile) => sameCell(tile, cell) && !tile.blocksMovement)
        || state.occupied.some((other) => sameCell(other, cell))
        || (step < distance && state.enemies.some((other) => other.hp > 0 && sameCell(other.cell, cell)))) return false
    }
    return true
  })
}
export function knownPreviewState(state: GameState): GameState {
  return { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => state.explored.has(cellId(tile)) ? tile
    : { ...tile, blocksMovement: false, blocksSight: false, prop: undefined, decoration: undefined, perchHeight: undefined }) },
    occupied: state.occupied.filter((cell) => canSeeContent(cellId(cell), state)),
    enemies: state.enemies.filter((enemy) => canSeeContent(cellId(enemy.cell), state)) }
}

// Preview uses only known terrain and currently visible occupants. Unscouted outlines are attempts,
// not promises: their appearance must never depend on an unseen wall or enemy.
export function movementPreviews(state: GameState) {
  const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, id) => ({ column: id % BOARD_SIZE, row: Math.floor(id / BOARD_SIZE) }))
  const knownBoard = { size: BOARD_SIZE, visible: state.visible, available: cells,
    blocked: state.dungeon.tiles.filter((tile) => state.explored.has(cellId(tile)) && tile.blocksMovement),
    occupied: [...state.occupied.filter((cell) => canSeeContent(cellId(cell), state)),
      ...state.enemies.filter((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state)).map((enemy) => enemy.cell)],
    perches: perchTiles(state.dungeon).filter((cell) => state.explored.has(cellId(cell))) }
  return chessDestinations(currentForm(state.transformations), state.cell, knownBoard)
    .map((cell) => ({ ...cell, uncertain: !canSeeContent(cellId(cell), state) }))
}
