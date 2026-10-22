import { formBalance, type ChessForm } from '../../data/forms'
import { canMove, canOccupy, type Cell, type Direction, type MovementBoard, type MovementRule } from './movement'
import { canKnightLand } from './perching'

export function formMovement(form: ChessForm): MovementRule {
  if (form === 'pawn') return canMove
  return (from, to, board) => {
    if (form === 'king') return Math.max(Math.abs(to.column - from.column), Math.abs(to.row - from.row)) === 1
      && canOccupy(from, { ...board, occupied: [] }) && canOccupy(to, board)
    if (form === 'knight') {
      if (!canOccupy(from, { ...board, occupied: [] }) && !board.perches?.some((cell) => cell.column === from.column && cell.row === from.row)) return false
      const x = Math.abs(to.column - from.column), y = Math.abs(to.row - from.row)
      if (x + y === 1) return canMove(from, to, board)
      return ((x === 1 && y === 2) || (x === 2 && y === 1)) && canKnightLand(to, board)
    }
    if (!canOccupy(from, { ...board, occupied: [] }) || !canOccupy(to, board)) return false
    const dx = to.column - from.column, dy = to.row - from.row
    const x = Math.abs(dx), y = Math.abs(dy)
    if (form === 'bishop' && x + y === 1) return canMove(from, to, board)
    const diagonal = x === y && x > 0, straight = (x === 0) !== (y === 0)
    if (!(form === 'bishop' ? diagonal : form === 'rook' ? straight : diagonal || straight)) return false
    const distance = Math.max(x, y)
    if (distance > formBalance[form].slideRange) return false
    for (let step = 1; step <= distance; step++) {
      const cell = { column: from.column + Math.sign(dx) * step, row: from.row + Math.sign(dy) * step }
      if ((board.visible && !board.visible.has(cell.row * board.size + cell.column)) || !canOccupy(cell, board)) return false
    }
    return true
  }
}
export function chessDestinations(form: ChessForm, from: Cell, board: MovementBoard) {
  const rule = formMovement(form)
  return Array.from({ length: board.size * board.size }, (_, index) => ({ column: index % board.size, row: Math.floor(index / board.size) }))
    .filter((cell) => rule(from, cell, board))
}

// One keypress is one action. Shift chooses Knight leaps or Bishop/Queen diagonals.
export function formKeyDestination(form: ChessForm, from: Cell, direction: Direction, alternate = false): Cell {
  const index = { north: 0, east: 1, south: 2, west: 3 }[direction]
  const offsets = form === 'knight' && alternate ? [[-1, -2], [2, -1], [1, 2], [-2, 1]]
    : (form === 'bishop' || form === 'queen' || form === 'king') && alternate ? [[-1, -1], [1, -1], [1, 1], [-1, 1]]
      : [[0, -1], [1, 0], [0, 1], [-1, 0]]
  return { column: from.column + offsets[index][0], row: from.row + offsets[index][1] }
}
