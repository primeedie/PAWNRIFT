import { canOccupy, adjacentCell, sameCell, type Cell, type MovementBoard } from './movement'
import type { Dungeon } from './dungeon'
import type { GameState } from './combat'

export function perchTiles(dungeon: Dungeon) {
  return dungeon.tiles.filter((tile) => tile.prop === 'block' && tile.blocksMovement
    && Number.isFinite(tile.perchHeight) && tile.perchHeight! > 0 && tile.perchHeight! <= 0.5)
    .map((tile) => ({ column: tile.column, row: tile.row, height: tile.perchHeight! }))
}
export function safeDismounts(from: Cell, board: MovementBoard) {
  return (['north', 'east', 'south', 'west'] as const).map((direction) => adjacentCell(from, direction))
    .filter((cell) => canOccupy(cell, board))
}
export function canKnightLand(cell: Cell, board: MovementBoard) {
  if (canOccupy(cell, board)) return true
  if (!canOccupy(cell, { ...board, blocked: [] })) return false
  const perch = board.perches?.some((entry) => sameCell(entry, cell))
  return !!perch && !board.occupied.some((entry) => sameCell(entry, cell)) && safeDismounts(cell, board).length > 0
}
export function playerBoard(state: GameState): MovementBoard {
  return { size: 8, available: state.dungeon.tiles, blocked: state.dungeon.tiles.filter((tile) => tile.blocksMovement),
    occupied: [...state.occupied, ...state.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.cell)], perches: perchTiles(state.dungeon) }
}
export function pawnLanding(state: GameState): Cell | undefined {
  const board = playerBoard(state)
  if (canOccupy(state.cell, board)) return state.cell
  return safeDismounts(state.cell, board)[0]
}
export function reversionReason(state: GameState) {
  if (!state.transformations.active) return 'Already Pawn.'
  if (state.status !== 'playing' || state.hp <= 0) return 'Run ended.'
  if (!pawnLanding(state)) return 'No safe adjacent landing. Dismount or clear a tile first.'
}
export function elevationAt(dungeon: Dungeon, cell: Cell) {
  return perchTiles(dungeon).find((tile) => sameCell(tile, cell))?.height ?? 0
}
