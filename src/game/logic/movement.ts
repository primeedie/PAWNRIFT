export type Cell = Readonly<{ column: number; row: number }>
export type Direction = 'north' | 'east' | 'south' | 'west'
export type MovementBoard = {
  size: number
  blocked: readonly Cell[]
  occupied: readonly Cell[]
  visible?: ReadonlySet<number>
  available?: readonly Cell[]
  perches?: readonly (Cell & { height: number })[]
}

const steps: Record<Direction, Cell> = {
  north: { column: 0, row: -1 },
  east: { column: 1, row: 0 },
  south: { column: 0, row: 1 },
  west: { column: -1, row: 0 },
}

export function sameCell(a: Cell, b: Cell) {
  return a.column === b.column && a.row === b.row
}

// Melee adjacency includes all eight neighboring cells; movement keeps its own piece rules.
export function isAdjacent(a: Cell, b: Cell) {
  return Math.max(Math.abs(a.column - b.column), Math.abs(a.row - b.row)) === 1
}

export function adjacentCell(cell: Cell, direction: Direction): Cell {
  const step = steps[direction]
  return { column: cell.column + step.column, row: cell.row + step.row }
}

function inBounds(cell: Cell, size: number) {
  return Number.isInteger(cell.column) && Number.isInteger(cell.row)
    && cell.column >= 0 && cell.row >= 0 && cell.column < size && cell.row < size
}

export function canOccupy(to: Cell, board: MovementBoard) {
  return inBounds(to, board.size)
    && (!board.available || board.available.some((cell) => sameCell(cell, to)))
    && !board.blocked.some((cell) => sameCell(cell, to))
    && !board.occupied.some((cell) => sameCell(cell, to))
}

export type MovementRule = (from: Cell, to: Cell, board: MovementBoard) => boolean

export const canMove: MovementRule = (from, to, board) =>
  inBounds(from, board.size) && Math.abs(to.column - from.column) + Math.abs(to.row - from.row) === 1
    && canOccupy(to, board)

export function legalDestinations(from: Cell, board: MovementBoard): Cell[] {
  return (Object.keys(steps) as Direction[])
    .map((direction) => adjacentCell(from, direction))
    .filter((to) => canMove(from, to, board))
}

export function directionTo(from: Cell, to: Cell): Direction {
  if (to.column > from.column) return 'east'
  if (to.column < from.column) return 'west'
  return to.row < from.row ? 'north' : 'south'
}
