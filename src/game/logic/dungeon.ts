import { BOARD_SIZE } from '../../utils/grid'
import { seededRandom } from '../../utils/seededRandom'
import type { PropKind } from '../../data/demoBoard'
import type { Cell } from './movement'

export const layoutStyles = ['maze', 'courtyard', 'corridors', 'branching'] as const
export type LayoutStyle = typeof layoutStyles[number]
export type DungeonTile = Cell & {
  blocksMovement: boolean
  blocksSight: boolean
  prop?: PropKind
  rotation: number
}
export type Reservation = Cell & { kind: 'enemy' | 'trap' | 'treasure' | 'alternate-exit' }
export type Dungeon = {
  seed: string
  style: LayoutStyle
  tiles: DungeonTile[]
  spawn: Cell
  exit: Cell
  reservations: Reservation[]
}

export const cellId = (cell: Cell) => cell.row * BOARD_SIZE + cell.column
export const cellFromId = (id: number): Cell => ({ column: id % BOARD_SIZE, row: Math.floor(id / BOARD_SIZE) })

export function neighborIds(id: number) {
  const { column, row } = cellFromId(id)
  return [[column, row - 1], [column + 1, row], [column, row + 1], [column - 1, row]]
    .filter(([x, y]) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE)
    .map(([x, y]) => y * BOARD_SIZE + x)
}

export function distancesFrom(open: ReadonlySet<number>, start: number) {
  const distances = new Map<number, number>()
  if (!open.has(start)) return distances
  const queue = [start]
  distances.set(start, 0)
  for (let i = 0; i < queue.length; i++) {
    for (const next of neighborIds(queue[i])) {
      if (!open.has(next) || distances.has(next)) continue
      distances.set(next, distances.get(queue[i])! + 1)
      queue.push(next)
    }
  }
  return distances
}

// Deterministically join any disconnected floor components using orthogonal corridors.
export function repairConnectivity(input: ReadonlySet<number>): Set<number> {
  const open = new Set([...input].filter((id) => Number.isInteger(id) && id >= 0 && id < 64))
  if (!open.size) open.add(27)
  for (;;) {
    const connected = distancesFrom(open, open.values().next().value!)
    const disconnected = [...open].find((id) => !connected.has(id))
    if (disconnected === undefined) return open
    const target = cellFromId(disconnected)
    const nearest = [...connected.keys()].sort((a, b) => {
      const ac = cellFromId(a), bc = cellFromId(b)
      return Math.abs(ac.column - target.column) + Math.abs(ac.row - target.row)
        - Math.abs(bc.column - target.column) - Math.abs(bc.row - target.row) || a - b
    })[0]
    let { column, row } = cellFromId(nearest)
    while (column !== target.column) { column += Math.sign(target.column - column); open.add(row * 8 + column) }
    while (row !== target.row) { row += Math.sign(target.row - row); open.add(row * 8 + column) }
  }
}

export function validateDungeon(dungeon: Dungeon): boolean {
  const { tiles, spawn, exit, reservations } = dungeon
  const validCell = (cell: Cell) => Number.isInteger(cell.column) && Number.isInteger(cell.row)
    && cell.column >= 0 && cell.column < 8 && cell.row >= 0 && cell.row < 8
  if (tiles.length !== 64 || !tiles.every(validCell) || new Set(tiles.map(cellId)).size !== 64) return false
  if (!validCell(spawn) || !validCell(exit) || cellId(spawn) === cellId(exit)) return false
  const open = new Set(tiles.filter((tile) => !tile.blocksMovement).map(cellId))
  const reachable = distancesFrom(open, cellId(spawn))
  const reservedIds = reservations.map(cellId)
  return open.has(cellId(spawn)) && reachable.has(cellId(exit)) && reachable.size === open.size
    && reservations.every((cell) => validCell(cell) && reachable.has(cellId(cell)))
    && !reservedIds.includes(cellId(spawn)) && !reservedIds.includes(cellId(exit))
    && new Set(reservedIds).size === reservedIds.length
}

export function generateDungeon(seed: string, requestedStyle?: LayoutStyle): Dungeon {
  const random = seededRandom(seed)
  const integer = (limit: number) => Math.floor(random() * limit)
  const choose = <T,>(items: T[]) => items[integer(items.length)]
  const shuffled = <T,>(items: T[]) => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = integer(i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
  const style = requestedStyle ?? choose([...layoutStyles])
  let open = new Set<number>()
  const carve = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < 8 && y < 8) open.add(y * 8 + x) }

  if (style === 'maze') {
    // Depth-first spanning tree on a two-tile lattice, leaving solid corridor dividers.
    const ox = integer(2), oy = integer(2)
    const start = (oy + integer(4) * 2) * 8 + ox + integer(4) * 2
    const visited = new Set([start]), stack = [start]
    open.add(start)
    while (stack.length) {
      const current = stack[stack.length - 1]
      const { column: x, row: y } = cellFromId(current)
      const candidates = [[x + 2, y], [x - 2, y], [x, y + 2], [x, y - 2]]
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < 8 && ny < 8 && !visited.has(ny * 8 + nx))
      if (!candidates.length) { stack.pop(); continue }
      const [nx, ny] = choose(candidates)
      carve((x + nx) / 2, (y + ny) / 2); carve(nx, ny)
      visited.add(ny * 8 + nx); stack.push(ny * 8 + nx)
    }
    // Some mazes retain dead ends; others gain a shortcut loop.
    if (random() < 0.65) {
      const links = Array.from({ length: 64 }, (_, id) => id).filter((id) => !open.has(id)
        && neighborIds(id).filter((next) => open.has(next)).length >= 2)
      if (links.length) open.add(choose(links))
    }
  } else if (style === 'courtyard') {
    const left = 1 + integer(2), top = 1 + integer(2)
    const width = 4 + integer(2), height = 4
    for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) carve(x, y)
    // Offset gates and side passages frame a room rather than scattered obstacles.
    const gateX = left + integer(width), gateY = top + integer(height)
    for (let y = 0; y < 8; y++) carve(gateX, y)
    for (let x = 0; x < 8; x++) carve(x, gateY)
    open.delete((top + 1) * 8 + left + 1 + integer(2)) // Low central pillar.
    for (let x = 0; x <= left; x++) carve(x, Math.min(7, top + height))
  } else if (style === 'corridors') {
    const rows = [integer(2), 3, 5 + integer(2)]
    const trunk = 1 + integer(6)
    rows.forEach((y) => { for (let x = 0; x < 8; x++) carve(x, y) })
    for (let y = rows[0]; y <= rows[2]; y++) carve(trunk, y)
    // Small junction room and an occasional second connection between passages.
    for (let y = 2; y <= 3; y++) for (let x = trunk; x <= trunk + 1; x++) carve(x, y)
    if (random() < 0.6) {
      const link = (trunk + 3) % 8
      for (let y = rows[0]; y <= rows[1]; y++) carve(link, y)
    }
  } else {
    // Grow a connected tree, only adding cells with one existing neighbor.
    // This preserves distinct branches and optional dead ends instead of filling a room.
    open.add((2 + integer(4)) * 8 + 2 + integer(4))
    const target = 28 + integer(8)
    while (open.size < target) {
      const frontier = Array.from({ length: 64 }, (_, id) => id).filter((id) => !open.has(id)
        && neighborIds(id).filter((next) => open.has(next)).length === 1)
      if (!frontier.length) break
      open.add(choose(frontier))
    }
  }

  // Rotate/reflect the structure, preserving connectivity and grid bounds.
  const turns = integer(4), reflect = random() < 0.5
  open = new Set([...open].map((id) => {
    let { column: x, row: y } = cellFromId(id)
    if (reflect) x = 7 - x
    for (let i = 0; i < turns; i++) [x, y] = [7 - y, x]
    return y * 8 + x
  }))
  open = repairConnectivity(open)
  const farthest = (start: number) => [...distancesFrom(open, start)].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
  const spawnId = farthest(choose([...open]))
  const exitId = farthest(spawnId)
  const candidates = shuffled([...open].filter((id) => id !== spawnId && id !== exitId))
  const fromSpawn = distancesFrom(open, spawnId)
  const alternate = [...candidates].sort((a, b) => fromSpawn.get(b)! - fromSpawn.get(a)!)[0]
  const reserved = [alternate, ...candidates.filter((id) => id !== alternate).slice(0, 3)]
  const kinds = ['alternate-exit', 'enemy', 'trap', 'treasure'] as const
  const protectedCells = new Set([spawnId, exitId, ...reserved])
  const obstacles: PropKind[] = ['wall', 'wall', 'wall', 'block', 'rock', 'tree']
  const tiles: DungeonTile[] = Array.from({ length: 64 }, (_, id) => {
    const blocked = !open.has(id)
    const prop = blocked ? choose(obstacles) : !protectedCells.has(id) && random() < 0.07 ? 'crystal' : undefined
    return { ...cellFromId(id), blocksMovement: blocked, blocksSight: prop === 'wall', prop, rotation: integer(4) * Math.PI / 2 }
  })
  const dungeon: Dungeon = {
    seed, style, tiles, spawn: cellFromId(spawnId), exit: cellFromId(exitId),
    reservations: reserved.map((id, index) => ({ ...cellFromId(id), kind: kinds[index] })),
  }
  // Repair happens before props/reservations; reject corrupted output rather than ship an invalid floor.
  if (!validateDungeon(dungeon)) throw new Error(`Dungeon validation failed for seed ${seed}`)
  return dungeon
}
