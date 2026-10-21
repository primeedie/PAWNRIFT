import { BOARD_SIZE } from '../../utils/grid'
import { cellId, type DungeonTile } from './dungeon'
import type { Cell } from './movement'

export type FogState = { visible: ReadonlySet<number>; explored: ReadonlySet<number> }
export type Visibility = 'hidden' | 'remembered' | 'visible'

export function visibleCells(tiles: readonly DungeonTile[], origin: Cell): Set<number> {
  const byId = new Map(tiles.map((tile) => [cellId(tile), tile]))
  const result = new Set<number>()
  if (!Number.isInteger(origin.column) || !Number.isInteger(origin.row)
    || !byId.has(cellId(origin)) || origin.column < 0 || origin.column >= BOARD_SIZE
    || origin.row < 0 || origin.row >= BOARD_SIZE) return result
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const target = { column: origin.column + dx, row: origin.row + dy }
    if (target.column < 0 || target.row < 0 || target.column >= 8 || target.row >= 8) continue
    const id = cellId(target)
    if (!byId.has(id)) continue
    // Supercover corner rule: a diagonal ray must clear both flanking cells.
    // Walls themselves can be seen; looking past an occluding corner cannot reveal tiles.
    if (dx && dy && (byId.get(cellId({ column: target.column, row: origin.row }))?.blocksSight
      || byId.get(cellId({ column: origin.column, row: target.row }))?.blocksSight)) continue
    result.add(id)
  }
  return result
}

export function updateFog(tiles: readonly DungeonTile[], origin: Cell, explored: ReadonlySet<number> = new Set()): FogState {
  const visible = visibleCells(tiles, origin)
  return { visible, explored: new Set([...explored, ...visible]) }
}

export function tileVisibility(id: number, fog: FogState): Visibility {
  return fog.visible.has(id) ? 'visible' : fog.explored.has(id) ? 'remembered' : 'hidden'
}

// Future enemies/loot/traps must use current sight, never remembered terrain visibility.
export function canSeeContent(id: number, fog: FogState) {
  return fog.visible.has(id)
}
