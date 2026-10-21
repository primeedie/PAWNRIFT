import { beforeEach, describe, expect, it } from 'vitest'
import { demoProps, demoTiles } from '../data/demoBoard'
import { adjacentCell, canMove, legalDestinations, type MovementBoard } from '../game/logic/movement'
import { usePawnStore } from '../game/state/pawnStore'
import type { Dungeon } from '../game/logic/dungeon'
import { updateFog } from '../game/logic/visibility'
import { createGame } from '../game/logic/combat'

// Retain the Stage 3 movement fixture; runtime now supplies a generated board.
const pawnSpawn = { column: 3, row: 4 }
const blockedCells = demoProps.filter((prop) => prop.blocksMovement)
const fixture: Dungeon = {
  seed: 'movement-fixture', style: 'courtyard', spawn: pawnSpawn, exit: { column: 4, row: 7 }, reservations: [],
  tiles: demoTiles.map((cell) => {
    const prop = demoProps.find((p) => p.column === cell.column && p.row === cell.row)
    return { ...cell, blocksMovement: prop?.blocksMovement ?? false, blocksSight: prop?.kind === 'wall',
      prop: prop?.kind, rotation: prop?.rotation ?? 0 }
  }),
}

const openBoard: MovementBoard = { size: 8, blocked: [], occupied: [] }

describe('orthogonal movement rules', () => {
  it('allows exactly the four one-cell neighbors on an open board', () => {
    expect(legalDestinations({ column: 3, row: 4 }, openBoard)).toEqual([
      { column: 3, row: 3 }, { column: 4, row: 4 },
      { column: 3, row: 5 }, { column: 2, row: 4 },
    ])
  })

  it('rejects diagonal, distant, same-cell, and non-integer destinations', () => {
    const origin = { column: 3, row: 4 }
    for (const destination of [origin, { column: 4, row: 5 }, { column: 5, row: 4 }, { column: 3.5, row: 4.5 }]) {
      expect(canMove(origin, destination, openBoard)).toBe(false)
    }
  })

  it.each([
    [{ column: 0, row: 0 }, { column: -1, row: 0 }],
    [{ column: 0, row: 0 }, { column: 0, row: -1 }],
    [{ column: 7, row: 7 }, { column: 8, row: 7 }],
    [{ column: 7, row: 7 }, { column: 7, row: 8 }],
  ])('blocks movement outside every edge (%j -> %j)', (from, to) => {
    expect(canMove(from, to, openBoard)).toBe(false)
  })

  it('blocks obstacles and occupied cells and excludes both from highlights', () => {
    const board: MovementBoard = {
      ...openBoard, blocked: [{ column: 3, row: 3 }], occupied: [{ column: 4, row: 4 }],
    }
    expect(legalDestinations({ column: 3, row: 4 }, board)).toEqual([
      { column: 3, row: 5 }, { column: 2, row: 4 },
    ])
    expect(canMove({ column: 3, row: 4 }, board.blocked[0], board)).toBe(false)
    expect(canMove({ column: 3, row: 4 }, board.occupied[0], board)).toBe(false)
  })

  it('uses explicit blocking data while allowing decorative cells', () => {
    expect(demoProps.every((prop) => typeof prop.blocksMovement === 'boolean')).toBe(true)
    const board = { ...openBoard, blocked: blockedCells }
    expect(canMove({ column: 7, row: 2 }, { column: 7, row: 3 }, board)).toBe(true)
    expect(canMove({ column: 5, row: 1 }, { column: 5, row: 2 }, board)).toBe(false)
    expect(blockedCells).not.toContainEqual(expect.objectContaining(pawnSpawn))
  })

  it('maps keyboard directions consistently with grid rows and columns', () => {
    expect(adjacentCell(pawnSpawn, 'north')).toEqual({ column: 3, row: 3 })
    expect(adjacentCell(pawnSpawn, 'east')).toEqual({ column: 4, row: 4 })
    expect(adjacentCell(pawnSpawn, 'south')).toEqual({ column: 3, row: 5 })
    expect(adjacentCell(pawnSpawn, 'west')).toEqual({ column: 2, row: 4 })
  })
})

describe('Pawn movement state', () => {
  beforeEach(() => usePawnStore.setState({ ...createGame(fixture), enemies: [], cell: pawnSpawn, from: pawnSpawn,
    phase: 'ready', runActive: true, facing: 'south', isMoving: false, occupied: [], revealAll: false, ...updateFog(fixture.tiles, pawnSpawn) }))
  const finishMove = () => {
    const { actionId, advancePlayback } = usePawnStore.getState()
    advancePlayback(actionId, 'player')
    advancePlayback(actionId, 'enemies')
  }

  it('commits one step and facing, rejects overlapping input, then unlocks', () => {
    const { tryMove } = usePawnStore.getState()
    expect(tryMove({ column: 4, row: 4 })).toBe(true)
    expect(usePawnStore.getState()).toMatchObject({
      from: pawnSpawn, cell: { column: 4, row: 4 }, facing: 'east', isMoving: true,
    })
    expect(tryMove({ column: 4, row: 5 })).toBe(false)
    finishMove()
    expect(usePawnStore.getState().isMoving).toBe(false)
    expect(tryMove({ column: 4, row: 5 })).toBe(true)
    expect(usePawnStore.getState().facing).toBe('south')
  })

  it('leaves state untouched on invalid, occupied, or obstacle clicks', () => {
    usePawnStore.setState({ cell: { column: 5, row: 1 }, occupied: [{ column: 4, row: 1 }] })
    const before = usePawnStore.getState()
    expect(before.tryMove({ column: 5, row: 2 })).toBe(false)
    expect(before.tryMove({ column: 4, row: 1 })).toBe(false)
    expect(before.tryMove({ column: 7, row: 7 })).toBe(false)
    expect(usePawnStore.getState()).toBe(before)
  })

  it('completion is idempotent and permits subsequent movement', () => {
    const { tryMove } = usePawnStore.getState()
    tryMove({ column: 3, row: 3 })
    finishMove()
    finishMove()
    expect(usePawnStore.getState()).toMatchObject({ from: { column: 3, row: 3 }, cell: { column: 3, row: 3 }, isMoving: false })
    expect(tryMove(pawnSpawn)).toBe(true)
  })
})
