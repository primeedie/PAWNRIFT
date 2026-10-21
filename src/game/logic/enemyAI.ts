import { BOARD_SIZE } from '../../utils/grid'
import { cellId, neighborIds, type Dungeon } from './dungeon'
import { canOccupy, sameCell, type Cell } from './movement'

export const gridDistance = (a: Cell, b: Cell) => Math.abs(a.column - b.column) + Math.abs(a.row - b.row)

// Center-to-center supercover sight. Missing cells are opaque; diagonal rays cannot peek past walls.
export function hasLineOfSight(dungeon: Dungeon, from: Cell, to: Cell): boolean {
  const tiles = new Map(dungeon.tiles.map((tile) => [cellId(tile), tile]))
  const opaque = (x: number, y: number) => x < 0 || y < 0 || x >= 8 || y >= 8
    || !tiles.has(y * 8 + x) || tiles.get(y * 8 + x)!.blocksSight
  if (!tiles.has(cellId(from)) || !tiles.has(cellId(to))) return false
  let x = from.column, y = from.row
  const dx = to.column - x, dy = to.row - y
  const sx = Math.sign(dx), sy = Math.sign(dy)
  const stepX = dx ? 1 / Math.abs(dx) : Infinity
  const stepY = dy ? 1 / Math.abs(dy) : Infinity
  let tx = stepX / 2, ty = stepY / 2
  while (x !== to.column || y !== to.row) {
    if (Math.abs(tx - ty) < 1e-9) {
      if (opaque(x + sx, y) || opaque(x, y + sy)) return false
      x += sx; y += sy; tx += stepX; ty += stepY
    } else if (tx < ty) { x += sx; tx += stepX }
    else { y += sy; ty += stepY }
    if (x === to.column && y === to.row) return true
    if (opaque(x, y)) return false
  }
  return true
}

// BFS uses occupancy on every expansion. Stable neighbor order provides deterministic ties.
export function nextPathStep(dungeon: Dungeon, from: Cell, target: Cell, occupied: readonly Cell[]): Cell | undefined {
  if (sameCell(from, target)) return undefined
  const board = { size: BOARD_SIZE, available: dungeon.tiles,
    blocked: dungeon.tiles.filter((tile) => tile.blocksMovement), occupied }
  const cells = new Map(dungeon.tiles.map((tile) => [cellId(tile), tile]))
  const parents = new Map<number, number>([[cellId(from), -1]])
  const queue = [from]
  for (let i = 0; i < queue.length; i++) {
    for (const id of neighborIds(cellId(queue[i]))) {
      const next = cells.get(id)
      if (!next || parents.has(id) || !canOccupy(next, board)) continue
      parents.set(id, cellId(queue[i]))
      if (sameCell(next, target)) {
        let step = id
        while (parents.get(step) !== cellId(from)) step = parents.get(step)!
        const cell = cells.get(step)!
        return { column: cell.column, row: cell.row }
      }
      queue.push(next)
    }
  }
  return undefined
}
