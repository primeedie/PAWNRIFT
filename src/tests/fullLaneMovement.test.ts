import { describe, expect, it } from 'vitest'
import type { BossForm } from '../data/forms'
import { formKeyDestination, formMovement } from '../game/logic/chessMovement'
import { createGame, movementBoard, resolvePlayerAction, resolveTurn, type GameState } from '../game/logic/combat'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { movementPreviews } from '../game/logic/formCombat'
import { movementRejection } from '../game/logic/playtesting'
import { activateTransformation, emptyTransformations, grantTransformation } from '../game/logic/transformations'
import { visibleCells } from '../game/logic/visibility'
import { movementDiagram } from '../ui/MovementGuide'

const c = (column: number, row: number) => ({ column, row })
const all = new Set(Array.from({ length: 64 }, (_, id) => id))
function game(form: BossForm): GameState {
  const dungeon: Dungeon = { seed: 'full-lane', style: 'courtyard', spawn: c(0, 0), exit: c(6, 7), reservations: [],
    tiles: [...all].map((id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
  return { ...createGame(dungeon), enemies: [], visible: all, explored: all,
    transformations: activateTransformation(grantTransformation(emptyTransformations(), form, 'light')!, form, 'light')! }
}
const lanes = [ ['bishop', c(7, 7)], ['rook', c(7, 0)], ['rook', c(0, 7)],
  ['queen', c(7, 7)], ['queen', c(7, 0)], ['queen', c(0, 7)] ] as const

describe('full-lane sliding', () => {
  it.each(lanes)('%s slides seven clear visible cells in one action with one enemy response', (form, destination) => {
    const base = game(form)
    const enemyCell = destination.row === 0 ? c(6, 1) : c(1, 6)
    const state: GameState = { ...base, energy: 0, enemies: [{ id: 'response', kind: 'rookling', cell: enemyCell,
      from: enemyCell, hp: 12, maxHp: 12, intent: 'pursue', lastSeen: destination, searchLeft: 2 }] }
    const before = structuredClone(state)
    expect(movementPreviews(state)).toContainEqual({ ...destination, uncertain: false })
    const player = resolvePlayerAction(state, { kind: 'move', destination })!
    expect(player.cell).toEqual(destination)
    expect(player.energy).toBe(0)
    expect(player.enemies[0]).toEqual(state.enemies[0])
    expect(player.transformations).toEqual(state.transformations)
    expect(player.signatures).toEqual(state.signatures)
    const next = resolveTurn(state, { kind: 'move', destination })!
    expect(next.turn).toBe(1)
    expect(next.energy).toBe(1)
    expect(next.events.filter((event) => event.actor === 'response')).toHaveLength(1)
    expect(next.events.filter((event) => event.actor === 'pawn').map((event) => event.kind)).toEqual(['move'])
    expect(next.enemies[0].hp).toBe(12)
    expect(state).toEqual(before)
  })
  it.each(lanes)('%s cannot cross walls, props, occupied cells, enemies, void, or fog', (form, destination) => {
    const state = game(form), middle = c(Math.sign(destination.column) * 3, Math.sign(destination.row) * 3), id = cellId(middle)
    const variants: GameState[] = [
      ...(['wall', 'tree', 'rock', 'block'] as const).map((prop) => ({ ...state, dungeon: { ...state.dungeon,
        tiles: state.dungeon.tiles.map((tile) => cellId(tile) === id ? { ...tile, prop, blocksMovement: true, blocksSight: prop === 'wall' } : tile) } })),
      { ...state, occupied: [middle] },
      { ...state, enemies: [{ id: 'blocker', kind: 'rookling', cell: middle, from: middle, hp: 8, maxHp: 8, intent: 'idle', searchLeft: 0 }] },
      { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.filter((tile) => cellId(tile) !== id) } },
      { ...state, visible: new Set([...all].filter((value) => value !== id)) },
      { ...state, visible: new Set([...all].filter((value) => value !== cellId(destination))) },
    ]
    for (const variant of variants) {
      const before = structuredClone(variant)
      expect(resolveTurn(variant, { kind: 'move', destination })).toBeNull()
      expect(variant).toEqual(before)
      expect(variant.turn).toBe(0)
    }
    expect(resolveTurn(state, { kind: 'move', destination: c(8, 8) })).toBeNull()
    expect(resolveTurn(state, { kind: 'move', destination: state.cell })).toBeNull()
  })
  it('normal one-tile vision limits slides without changing sight or leaking hidden collision', () => {
    for (const form of ['bishop', 'rook', 'queen'] as const) {
      const state = game(form)
      state.visible = visibleCells(state.dungeon.tiles, state.cell)
      const hidden = { ...state, occupied: [c(3, 0)], dungeon: { ...state.dungeon,
        tiles: state.dungeon.tiles.map((tile) => cellId(tile) === 27 ? { ...tile, prop: 'wall' as const, blocksMovement: true, blocksSight: true } : tile) } }
      const previews = movementPreviews(state)
      expect(previews.every((cell) => state.visible.has(cellId(cell)) && !cell.uncertain)).toBe(true)
      expect(previews).toEqual(movementPreviews(hidden))
      expect(movementRejection(state, c(7, 7))).toBe(movementRejection(hidden, c(7, 7)))
      expect(formMovement(form)(c(0, 0), form === 'rook' ? c(7, 0) : c(7, 7), movementBoard(state))).toBe(false)
      expect(state.visible.size).toBe(4)
    }
  })
})

describe('Bishop corridor walking', () => {
  it('walks one orthogonal tile without Energy, signature activation or extra turn, even without diagonals', () => {
    const base = game('bishop')
    const state = { ...base, energy: 0, dungeon: { ...base.dungeon,
      tiles: base.dungeon.tiles.map((tile) => tile.row === 0 ? tile : { ...tile, blocksMovement: true, prop: 'wall' as const, blocksSight: true }) } }
    const player = resolvePlayerAction(state, { kind: 'move', destination: c(1, 0) })!
    expect(player.energy).toBe(0)
    expect(player.signatures).toEqual(state.signatures)
    expect(player.transformations).toEqual(state.transformations)
    const next = resolveTurn(state, { kind: 'move', destination: c(1, 0) })!
    expect(next.turn).toBe(1)
    expect(next.cell).toEqual(c(1, 0))
    expect(resolveTurn(state, { kind: 'move', destination: c(2, 0) })).toBeNull()
    expect(resolveTurn(state, { kind: 'move', destination: c(0, 1) })).toBeNull()
    expect(resolveTurn({ ...state, occupied: [c(1, 0)] }, { kind: 'move', destination: c(1, 0) })).toBeNull()
    expect(formMovement('bishop')(c(0, 0), c(2, 1), movementBoard(base))).toBe(false)
  })
  it('keeps four walk keys, shifted diagonals and distinct 5x5 walk/slide markers', () => {
    const from = c(3, 3)
    for (const direction of ['north', 'east', 'south', 'west'] as const) {
      const to = formKeyDestination('bishop', from, direction)
      expect(Math.abs(to.column - from.column) + Math.abs(to.row - from.row)).toBe(1)
      const diagonal = formKeyDestination('bishop', from, direction, true)
      expect(Math.abs(diagonal.column - from.column)).toBe(1)
      expect(Math.abs(diagonal.row - from.row)).toBe(1)
    }
    expect(movementDiagram('bishop').filter((tile) => tile.kind === 'walk')).toHaveLength(4)
    expect(movementDiagram('bishop').filter((tile) => tile.kind === 'slide')).toHaveLength(8)
  })
})
