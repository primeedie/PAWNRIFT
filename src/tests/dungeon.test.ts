import { describe, expect, it } from 'vitest'
import { cellFromId, cellId, generateDungeon, layoutStyles, neighborIds, repairConnectivity, validateDungeon } from '../game/logic/dungeon'
import { canMove, legalDestinations, sameCell, type Cell } from '../game/logic/movement'
import { canSeeContent, tileVisibility, updateFog, visibleCells } from '../game/logic/visibility'
import { usePawnStore } from '../game/state/pawnStore'
import { movementBoard } from '../game/logic/combat'

describe('seeded dungeon invariants: 1,000 seeds for each layout style', () => {
  for (const style of layoutStyles) {
    it(`${style}: reproducible, connected, valid spawn/exit/reservations, bounded fog`, () => {
      const masks = new Set<string>()
      for (let seed = 0; seed < 1000; seed++) {
        const dungeon = generateDungeon(`audit-${seed}`, style)
        expect(dungeon).toEqual(generateDungeon(`audit-${seed}`, style))
        expect(validateDungeon(dungeon)).toBe(true)
        expect(dungeon.tiles).toHaveLength(64)
        expect(new Set(dungeon.tiles.map(cellId)).size).toBe(64)
        expect(dungeon.tiles.every((tile) => Number.isInteger(tile.column) && Number.isInteger(tile.row)
          && tile.column >= 0 && tile.column < 8 && tile.row >= 0 && tile.row < 8)).toBe(true)
        const blocked = dungeon.tiles.filter((tile) => tile.blocksMovement)
        const board = { size: 8, blocked, occupied: [] }
        expect(blocked.some((tile) => sameCell(tile, dungeon.spawn) || sameCell(tile, dungeon.exit))).toBe(false)
        // Independent flood using actual Pawn movement, not the generator's connectivity helper.
        const queue: Cell[] = [dungeon.spawn], reachable = new Set([cellId(dungeon.spawn)])
        for (let i = 0; i < queue.length; i++) {
          for (const next of legalDestinations(queue[i], board)) {
            if (reachable.has(cellId(next))) continue
            reachable.add(cellId(next)); queue.push(next)
          }
        }
        expect(reachable.has(cellId(dungeon.exit))).toBe(true)
        expect(reachable.size).toBe(64 - blocked.length)
        expect(dungeon.reservations).toHaveLength(4)
        expect(new Set(dungeon.reservations.map(cellId)).size).toBe(4)
        expect(dungeon.reservations.every((cell) => reachable.has(cellId(cell))
          && !sameCell(cell, dungeon.spawn) && !sameCell(cell, dungeon.exit))).toBe(true)
        expect(dungeon.reservations.every((cell) => !dungeon.tiles[cellId(cell)].prop)).toBe(true)

        const fog = updateFog(dungeon.tiles, dungeon.spawn)
        expect(fog.visible.has(cellId(dungeon.spawn))).toBe(true)
        expect(fog.visible.size).toBeLessThanOrEqual(9)
        for (const tile of dungeon.tiles) {
          const near = Math.abs(tile.column - dungeon.spawn.column) <= 1 && Math.abs(tile.row - dungeon.spawn.row) <= 1
          if (!near) expect(fog.visible.has(cellId(tile))).toBe(false)
        }
        const next = legalDestinations(dungeon.spawn, board)[0]
        expect(next).toBeDefined()
        const moved = updateFog(dungeon.tiles, next, fog.explored)
        expect([...fog.explored].every((id) => moved.explored.has(id))).toBe(true)
        expect([...moved.visible].every((id) => moved.explored.has(id))).toBe(true)
        expect(canSeeContent(cellId(next), moved)).toBe(true)
        masks.add(dungeon.tiles.map((tile) => tile.blocksMovement ? '1' : '0').join(''))
      }
      expect(masks.size).toBeGreaterThan(50)
    }, 30000)
  }

  it('seed alone selects styles reproducibly and exercises every style', () => {
    const styles = new Set<string>()
    for (let seed = 0; seed < 1000; seed++) {
      const a = generateDungeon(String(seed))
      expect(a).toEqual(generateDungeon(String(seed)))
      styles.add(a.style)
    }
    expect([...styles].sort()).toEqual([...layoutStyles].sort())
    expect(generateDungeon('')).toEqual(generateDungeon(''))
    expect(generateDungeon('♟ dungeon')).toEqual(generateDungeon('♟ dungeon'))
  }, 30000)

  it('repairs disconnected regions using ordinary orthogonal steps', () => {
    const open = repairConnectivity(new Set([0, 7, 56, 63]))
    const queue = [0], reached = new Set(queue)
    for (let i = 0; i < queue.length; i++) for (const next of neighborIds(queue[i])) {
      if (open.has(next) && !reached.has(next)) { reached.add(next); queue.push(next) }
    }
    expect(reached.size).toBe(open.size)
    expect([7, 56, 63].every((id) => reached.has(id))).toBe(true)
    expect(open).toEqual(repairConnectivity(new Set([0, 7, 56, 63])))
  })

  it('produces real branch/dead-end structures, optional maze loops, and open courtyards', () => {
    const mazeCycles = new Set<boolean>()
    for (let seed = 0; seed < 100; seed++) {
      const branch = generateDungeon(`topology-${seed}`, 'branching')
      const open = new Set(branch.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
      const degrees = [...open].map((id) => neighborIds(id).filter((next) => open.has(next)).length)
      expect(degrees.reduce((sum, degree) => sum + degree, 0) / 2).toBe(open.size - 1)
      expect(degrees.filter((degree) => degree === 1).length).toBeGreaterThan(2)
      expect(degrees.some((degree) => degree >= 3)).toBe(true)
      const maze = generateDungeon(`topology-${seed}`, 'maze')
      const mazeOpen = new Set(maze.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
      const edges = [...mazeOpen].reduce((sum, id) => sum + neighborIds(id).filter((next) => mazeOpen.has(next)).length, 0) / 2
      mazeCycles.add(edges >= mazeOpen.size)
      const room = generateDungeon(`topology-${seed}`, 'courtyard')
      const roomOpen = new Set(room.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
      const squares = [...roomOpen].filter((id) => {
        const cell = cellFromId(id)
        return cell.column < 7 && cell.row < 7 && [id + 1, id + 8, id + 9].every((next) => roomOpen.has(next))
      })
      expect(squares.length).toBeGreaterThanOrEqual(4)
    }
    expect(mazeCycles).toEqual(new Set([true, false]))
  })

  it('rejects corrupted layouts and unreachable exits', () => {
    const dungeon = generateDungeon('validator')
    expect(validateDungeon({ ...dungeon, tiles: dungeon.tiles.slice(1) })).toBe(false)
    expect(validateDungeon({ ...dungeon, spawn: { column: -1, row: 0 } })).toBe(false)
    expect(validateDungeon({ ...dungeon, tiles: dungeon.tiles.map((tile) => ({ ...tile, blocksMovement: !sameCell(tile, dungeon.spawn) })) })).toBe(false)
  })
})

describe('one-tile fog and line of sight', () => {
  const tiles = Array.from({ length: 64 }, (_, id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 }))
  it('sees all nine cells in open space and only four at a corner', () => {
    expect(visibleCells(tiles, { column: 3, row: 3 }).size).toBe(9)
    expect(visibleCells(tiles, { column: 0, row: 0 })).toEqual(new Set([0, 1, 8, 9]))
  })
  it('does not reveal tiles from invalid grid origins', () => {
    for (const origin of [{ column: -1, row: 0 }, { column: 8, row: 0 }, { column: 0, row: 0.125 }]) {
      expect(visibleCells(tiles, origin).size).toBe(0)
    }
  })
  it.each([1, 8])('sees wall %i itself but blocks diagonal sight past either flank', (wall) => {
    const blocked = tiles.map((tile) => ({ ...tile, blocksSight: cellId(tile) === wall }))
    const seen = visibleCells(blocked, { column: 0, row: 0 })
    expect(seen.has(wall)).toBe(true)
    expect(seen.has(9)).toBe(false)
    expect(seen.has(2)).toBe(false)
  })
  it('keeps explored terrain but never exposes unseen content', () => {
    const initial = updateFog(tiles, { column: 0, row: 0 })
    const moved = updateFog(tiles, { column: 2, row: 0 }, initial.explored)
    expect(tileVisibility(0, moved)).toBe('remembered')
    expect(canSeeContent(0, moved)).toBe(false)
    expect(tileVisibility(63, moved)).toBe('hidden')
    expect(canSeeContent(63, moved)).toBe(false)
    expect(tileVisibility(2, moved)).toBe('visible')
    expect(initial.explored).toEqual(new Set([0, 1, 8, 9]))
  })
})

describe('generated floor integration', () => {
  it('uses generated collision, updates fog on completion, and resets atomically', () => {
    const state = usePawnStore.getState()
    state.loadDungeon('store-a', 'maze')
    const before = usePawnStore.getState()
    const board = movementBoard(before)
    const target = legalDestinations(before.cell, board)[0]
    expect(canMove(before.cell, target, board)).toBe(true)
    expect(before.tryMove(target)).toBe(true)
    expect(usePawnStore.getState().visible).toEqual(visibleCells(before.dungeon.tiles, target))
    const id = usePawnStore.getState().actionId
    state.advancePlayback(id, 'player')
    state.advancePlayback(id, 'enemies')
    const after = usePawnStore.getState()
    expect(after.visible).toEqual(visibleCells(after.dungeon.tiles, after.cell))
    expect([...before.explored].every((id) => after.explored.has(id))).toBe(true)
    const knowledge = after.explored
    state.toggleReveal()
    expect(usePawnStore.getState().explored).toBe(knowledge)
    state.toggleReveal()
    expect(usePawnStore.getState().explored).toBe(knowledge)
    const next = legalDestinations(after.cell, board)[0]
    after.tryMove(next)
    state.loadDungeon('store-b', 'courtyard')
    const reset = usePawnStore.getState()
    expect(reset.cell).toEqual(reset.dungeon.spawn)
    expect(reset.from).toEqual(reset.cell)
    expect(reset.isMoving).toBe(false)
    expect(reset.occupied).toEqual([])
    expect(reset.revealAll).toBe(false)
    expect(reset.explored).toEqual(reset.visible)
  })
})
