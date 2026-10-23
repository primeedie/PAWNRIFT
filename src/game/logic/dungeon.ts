import { BOARD_SIZE } from '../../utils/grid'
import { seededRandom } from '../../utils/seededRandom'
import type { PropKind } from '../../data/demoBoard'
import type { Cell } from './movement'
import type { BiomeMotif } from '../../data/biomes'

export const layoutStyles = ['maze', 'courtyard', 'corridors', 'branching'] as const
// Initial density tuning, not quotas: preserve connectivity and obstacle spacing first.
export const dungeonTuning = { minBlockingDensity: 0.10, maxBlockingDensity: 0.15, decorationChance: 0.28 } as const
export type LayoutStyle = typeof layoutStyles[number]
export type DungeonTile = Cell & {
  blocksMovement: boolean
  blocksSight: boolean
  prop?: PropKind
  // Small corner scenery leaves the tile center clear and never participates in collision/sight.
  decoration?: { kind: 'tree' | 'rock' | 'crystal'; corner: number;motif?:BiomeMotif }
  // Explicitly designated flat low block top; rounded rocks/trees/walls are not perches.
  perchHeight?: number
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
  generation?: { attempt: number; sourceSeed: string; repaired: boolean; fallback: boolean; issues: string[] }
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
  for (let attempt = 0; attempt < 64; attempt++) {
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
  return new Set(Array.from({ length: 64 }, (_, id) => id))
}

export const validCell = (cell: Cell) => Number.isInteger(cell.column) && Number.isInteger(cell.row)
  && cell.column >= 0 && cell.column < 8 && cell.row >= 0 && cell.row < 8
export const blockingProp = (prop?: PropKind) => prop !== undefined && prop !== 'crystal'

export function dungeonIssues(dungeon: Dungeon): string[] {
  const { tiles, spawn, exit, reservations } = dungeon
  const issues: string[] = []
  if (tiles.length !== 64 || !tiles.every(validCell) || new Set(tiles.map(cellId)).size !== 64) issues.push('Missing, duplicate or out-of-bounds tiles')
  if (!validCell(spawn) || !validCell(exit) || cellId(spawn) === cellId(exit)) issues.push('Invalid spawn or progression destination')
  const open = new Set(tiles.filter((tile) => !tile.blocksMovement).map(cellId))
  const reachable = distancesFrom(open, cellId(spawn))
  const reservedIds = reservations.map(cellId)
  if (!validCell(spawn) || !open.has(cellId(spawn))) issues.push('Spawn is not walkable')
  if (neighborIds(cellId(spawn)).filter((id) => open.has(id)).length < 2) issues.push('Fewer than two safe spawn exits')
  if (!reachable.has(cellId(exit))) issues.push('Objective unreachable')
  if (reachable.size !== open.size) issues.push('Disconnected playable terrain')
  if (!reservations.every((cell) => validCell(cell) && reachable.has(cellId(cell)))
    || reservedIds.includes(cellId(spawn)) || reservedIds.includes(cellId(exit))
    || new Set(reservedIds).size !== reservedIds.length) issues.push('Invalid reserved placement')
  if (tiles.some((tile) => blockingProp(tile.prop) !== tile.blocksMovement || tile.blocksSight !== (tile.prop === 'wall')
    || (tile.perchHeight !== undefined && (tile.prop !== 'block' || tile.perchHeight <= 0 || tile.perchHeight > 0.5)))) issues.push('Logical/rendered obstacle mismatch')
  return issues
}
export const validateDungeon = (dungeon: Dungeon) => dungeonIssues(dungeon).length === 0

export type GenerationStreams={obstacles:string;environment:string}
function buildDungeon(seed: string, requestedStyle?: LayoutStyle,streams?:GenerationStreams): Dungeon {
  let random = seededRandom(seed)
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
  // Retain a few useful, separated blockers from the already connected layout. Opening
  // the rest creates combat space/diagonals without severing any established Pawn route.
  // Perimeter geometry is structural and excluded from the candidate-floor density.
  if(streams)random=seededRandom(streams.obstacles)
  const interior = Array.from({ length: 64 }, (_, id) => id).filter((id) => {
    const { column, row } = cellFromId(id)
    return column > 0 && column < 7 && row > 0 && row < 7
  })
  const target = Math.round(interior.length * (dungeonTuning.minBlockingDensity
    + random() * (dungeonTuning.maxBlockingDensity - dungeonTuning.minBlockingDensity)))
  const retained: number[] = []
  for (const id of shuffled(interior.filter((id) => !open.has(id)))) {
    const cell = cellFromId(id)
    if (retained.length < target && retained.every((other) => {
      const a = cellFromId(other)
      return Math.max(Math.abs(a.column - cell.column), Math.abs(a.row - cell.row)) > 1
    })) retained.push(id)
  }
  for (const id of interior) if (!retained.includes(id)) open.add(id)
  open = repairConnectivity(open)
  const farthest = (start: number) => [...distancesFrom(open, start)].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
  // Farthest endpoints are usually leaves. Select a junction with two existing exits instead.
  const originDistances = distancesFrom(open, choose([...open]))
  const spawnId = [...open].filter((id) => neighborIds(id).filter((next) => open.has(next)).length >= 2)
    .sort((a, b) => originDistances.get(b)! - originDistances.get(a)! || a - b)[0]
  const exitId = farthest(spawnId)
  const candidates = shuffled([...open].filter((id) => id !== spawnId && id !== exitId))
  const fromSpawn = distancesFrom(open, spawnId)
  const alternate = [...candidates].sort((a, b) => fromSpawn.get(b)! - fromSpawn.get(a)!)[0]
  const enemy = candidates.find((id) => id !== alternate && fromSpawn.get(id)! >= 3)!
  const reserved = [alternate, enemy, ...candidates.filter((id) => id !== alternate && id !== enemy).slice(0, 2)]
  const kinds = ['alternate-exit', 'enemy', 'trap', 'treasure'] as const
  const protectedCells = new Set([spawnId, exitId, ...reserved])
  const obstacles: PropKind[] = ['wall', 'block', 'rock', 'tree']
  const environment=streams?seededRandom(streams.environment):undefined
  const props=streams?seededRandom(`${streams.obstacles}:models`):undefined
  const tiles: DungeonTile[] = Array.from({ length: 64 }, (_, id) => {
    const blocked = !open.has(id)
    const prop = blocked ? props?obstacles[Math.floor(props()*obstacles.length)]:choose(obstacles) : undefined
    const decoration = !blocked && !protectedCells.has(id) && (environment??random)() < dungeonTuning.decorationChance
      ? { kind: environment?(['tree','rock','crystal'] as const)[Math.floor(environment()*3)]:choose<'tree' | 'rock' | 'crystal'>(['tree', 'rock', 'crystal']), corner: environment?Math.floor(environment()*4):integer(4) } : undefined
    return { ...cellFromId(id), blocksMovement: blocked, blocksSight: prop === 'wall', prop,
      ...(decoration ? { decoration } : {}),
      ...(prop === 'block' ? { perchHeight: 0.475 } : {}), rotation: (environment?Math.floor(environment()*4):integer(4)) * Math.PI / 2 }
  })
  const dungeon: Dungeon = {
    seed, style, tiles, spawn: cellFromId(spawnId), exit: cellFromId(exitId),
    reservations: reserved.map((id, index) => ({ ...cellFromId(id), kind: kinds[index] })),
  }
  return dungeon
}

// Deterministic, bounded recovery is also usable by diagnostics/regression scenarios.
export function repairDungeon(input: Dungeon): Dungeon {
  const spawn = validCell(input.spawn) ? input.spawn : cellFromId(27)
  const open = repairConnectivity(new Set(input.tiles.filter((tile) => validCell(tile) && !tile.blocksMovement).map(cellId)))
  open.add(cellId(spawn))
  if (validCell(input.exit) && cellId(input.exit) !== cellId(spawn)) open.add(cellId(input.exit))
  for (const id of neighborIds(cellId(spawn))) {
    if (neighborIds(cellId(spawn)).filter((next) => open.has(next)).length >= 2) break
    open.add(id)
  }
  const connected = repairConnectivity(open)
  const reachable = distancesFrom(connected, cellId(spawn))
  const exit = validCell(input.exit) && connected.has(cellId(input.exit)) && cellId(input.exit) !== cellId(spawn) ? input.exit
    : cellFromId([...reachable].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0])
  const used = new Set([cellId(spawn), cellId(exit)])
  const reservations = input.reservations.flatMap((cell) => {
    const id = validCell(cell) && connected.has(cellId(cell)) && !used.has(cellId(cell)) ? cellId(cell)
      : [...connected].find((next) => !used.has(next))
    if (id === undefined) return []
    used.add(id); return [{ ...cellFromId(id), kind: cell.kind }]
  })
  const tiles = Array.from({ length: 64 }, (_, id): DungeonTile => {
    const original = input.tiles.find((tile) => validCell(tile) && cellId(tile) === id)
    const blocksMovement = !connected.has(id)
    const prop = blocksMovement ? blockingProp(original?.prop) ? original!.prop : 'wall'
      : used.has(id) ? undefined : original?.prop === 'crystal' ? 'crystal' : undefined
    return { ...cellFromId(id), blocksMovement, blocksSight: prop === 'wall', prop, rotation: original?.rotation ?? 0,
      ...(!blocksMovement && !used.has(id) && original?.decoration ? { decoration: original.decoration } : {}),
      ...(prop === 'block' ? { perchHeight: 0.475 } : {}) }
  })
  return { ...input, tiles, spawn, exit, reservations }
}

export function fallbackDungeon(seed: string, style: LayoutStyle = 'courtyard'): Dungeon {
  return { seed, style, spawn: cellFromId(18), exit: cellFromId(54),
    reservations: [20, 36, 42, 50].map((id, i) => ({ ...cellFromId(id), kind: (['alternate-exit', 'enemy', 'trap', 'treasure'] as const)[i] })),
    tiles: Array.from({ length: 64 }, (_, id) => { const cell = cellFromId(id), blocked = cell.column === 0 || cell.row === 0 || cell.column === 7 || cell.row === 7
      return { ...cell, blocksMovement: blocked, blocksSight: blocked, prop: blocked ? 'wall' : undefined, rotation: 0 }
    }) }
}

export function generateDungeon(seed: string, requestedStyle?: LayoutStyle,streams?:GenerationStreams): Dungeon {
  const failures: string[] = []
  for (let attempt = 0; attempt < 3; attempt++) {
    const sourceSeed = attempt ? `${seed}:layout-attempt:${attempt}` : seed
    try {
      const candidate = { ...buildDungeon(sourceSeed, requestedStyle,streams?{obstacles:`${streams.obstacles}:${attempt}`,environment:`${streams.environment}:${attempt}`}:undefined), seed }
      const issues = dungeonIssues(candidate)
      const repaired = issues.length > 0 ? repairDungeon(candidate) : candidate
      if (validateDungeon(repaired)) return { ...repaired, generation: { attempt, sourceSeed, repaired: issues.length > 0, fallback: false, issues: [...failures, ...issues] } }
      failures.push(...issues, ...dungeonIssues(repaired))
    } catch (error) { failures.push(error instanceof Error ? error.message : 'Generation failed') }
  }
  return { ...fallbackDungeon(seed, requestedStyle), generation: { attempt: 3, sourceSeed: `${seed}:fallback`, repaired: false, fallback: true, issues: failures } }
}

export const floorSeed = (masterSeed: string, floor: number) => floor <= 1 ? masterSeed : `${masterSeed}:floor:${floor}:layout`
