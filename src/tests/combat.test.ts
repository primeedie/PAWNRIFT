import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { combatBalance as balance } from '../data/combatBalance'
import { checkerIndex, chessTileColors } from '../data/terrainPalette'
import { cellFromId, cellId, generateDungeon, layoutStyles, type Dungeon } from '../game/logic/dungeon'
import { attackTargets, createGame, movementBoard, resolvePlayerAction, resolveTurn, type Enemy, type GameState } from '../game/logic/combat'
import { gridDistance, hasLineOfSight, nextPathStep } from '../game/logic/enemyAI'
import { legalDestinations, sameCell, type Cell } from '../game/logic/movement'
import { canSeeContent, tileVisibility, updateFog } from '../game/logic/visibility'
import { usePawnStore } from '../game/state/pawnStore'

function floor(): Dungeon {
  return { seed: 'combat-fixture', style: 'courtyard', spawn: { column: 3, row: 3 }, exit: { column: 7, row: 7 },
    reservations: [], tiles: Array.from({ length: 64 }, (_, id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
}
function enemy(column: number, row: number, id = 'rookling-1'): Enemy {
  const cell = { column, row }
  return { id, kind: 'rookling', cell, from: cell, hp: balance.enemyMaxHp, maxHp: balance.enemyMaxHp, intent: 'idle', searchLeft: 0 }
}
function game(enemies: Enemy[] = [enemy(4, 3)]): GameState { return { ...createGame(floor()), enemies } }

describe('deterministic synchronized turns', () => {
  it('resolves player first, then exactly one response per living enemy', () => {
    const state = game([enemy(5, 3), enemy(6, 4, 'rookling-2')])
    const action = { kind: 'move', destination: { column: 3, row: 4 } } as const
    const after = resolveTurn(state, action)!
    expect(after).toEqual(resolveTurn(state, action))
    expect(after.turn).toBe(1)
    expect(after.cell).toEqual(action.destination)
    expect(state.turn).toBe(0)
    expect(state.cell).toEqual({ column: 3, row: 3 })
    for (const old of state.enemies) {
      const current = after.enemies.find((e) => e.id === old.id)!
      expect(gridDistance(old.cell, current.cell)).toBeLessThanOrEqual(1)
      expect(after.events.filter((event) => event.actor === old.id && ['move', 'windup', 'miss', 'hit'].includes(event.kind))).toHaveLength(1)
    }
  })
  it('invalid movement or targets produce no turn or state mutation', () => {
    const state = game()
    const original = structuredClone(state)
    for (const action of [
      { kind: 'move', destination: { column: 4, row: 3 } },
      { kind: 'move', destination: { column: 4, row: 4 } },
      { kind: 'move', destination: { column: -1, row: 3 } },
      { kind: 'attack', targetId: 'missing' },
    ] as const) expect(resolveTurn(state, action)).toBeNull()
    expect(state).toEqual(original)
    const hole = { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.filter((tile) => !sameCell(tile, { column: 3, row: 2 })) } }
    expect(resolveTurn(hole, { kind: 'move', destination: { column: 3, row: 2 } })).toBeNull()
    const wall = { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => ({ ...tile, blocksMovement: sameCell(tile, { column: 3, row: 2 }) })) } }
    expect(resolveTurn(wall, { kind: 'move', destination: { column: 3, row: 2 } })).toBeNull()
  })
  it('wait advances one turn and adjacent enemies telegraph before striking', () => {
    const first = resolveTurn(game(), { kind: 'wait' })!
    expect(first.turn).toBe(1)
    expect(first.hp).toBe(balance.playerMaxHp)
    expect(first.enemies[0]).toMatchObject({ intent: 'attack', attackTarget: first.cell })
    const second = resolveTurn(first, { kind: 'wait' })!
    expect(second.turn).toBe(2)
    expect(second.hp).toBe(balance.playerMaxHp - balance.enemyDamage)
    expect(second.enemies[0].intent).toBe('idle')
  })
  it('basic attacks are reliable; killed enemies cannot respond', () => {
    const state = game([{ ...enemy(4, 3), hp: balance.playerDamage, intent: 'attack', attackTarget: { column: 3, row: 3 } }])
    const next = resolveTurn(state, { kind: 'attack', targetId: 'rookling-1' })!
    expect(next.enemies[0].hp).toBe(0)
    expect(next.hp).toBe(state.hp)
    expect(next.events.some((event) => event.kind === 'defeat' && event.actor === 'rookling-1')).toBe(true)
    expect(next.events.some((event) => event.kind === 'hit' && event.actor === 'rookling-1')).toBe(false)
    expect(attackTargets(next)).toEqual([])
    expect(resolveTurn(next, { kind: 'move', destination: { column: 4, row: 3 } })).not.toBeNull()
  })
  it('defend reduces damage and counters a real incoming strike once', () => {
    const charged = resolveTurn(game(), { kind: 'wait' })!
    const guarded = resolveTurn(charged, { kind: 'defend' })!
    expect(guarded.hp).toBe(balance.playerMaxHp - Math.max(0, balance.enemyDamage - balance.guardReduction))
    expect(guarded.enemies[0].hp).toBe(balance.enemyMaxHp - balance.counterDamage)
    expect(guarded.events.filter((event) => event.kind === 'counter')).toHaveLength(1)
    expect(guarded.guarding).toBe(false)
    const chargedAgain = resolveTurn(guarded, { kind: 'wait' })!
    const unguarded = resolveTurn(chargedAgain, { kind: 'wait' })!
    expect(unguarded.hp).toBe(guarded.hp - balance.enemyDamage)
  })
  it('lets a player evade the marked strike tile without a homing attack', () => {
    const charged = resolveTurn(game(), { kind: 'wait' })!
    const escaped = resolveTurn(charged, { kind: 'move', destination: { column: 2, row: 3 } })!
    expect(escaped.hp).toBe(charged.hp)
    expect(escaped.events.some((event) => event.kind === 'miss')).toBe(true)
    expect(escaped.enemies[0].cell).toEqual(charged.enemies[0].cell)
  })
  it('handles lethal counters, defeat, floor victory, and terminal input rejection', () => {
    const charging = { ...enemy(4, 3), hp: balance.counterDamage, intent: 'attack' as const, attackTarget: { column: 3, row: 3 } }
    expect(resolveTurn(game([charging]), { kind: 'defend' })!.enemies[0].hp).toBe(0)
    const dead = resolveTurn({ ...game([charging]), hp: 1 }, { kind: 'wait' })!
    expect(dead.status).toBe('defeat')
    expect(dead.hp).toBe(0)
    expect(resolveTurn(dead, { kind: 'wait' })).toBeNull()
    const exit = { column: 3, row: 4 }
    const clear = { ...game([]), dungeon: { ...floor(), exit } }
    const won = resolveTurn(clear, { kind: 'move', destination: exit })!
    expect(won.status).toBe('victory')
    expect(won.turn).toBe(1)
    expect(resolveTurn(won, { kind: 'wait' })).toBeNull()
    const occupiedFloor = { ...game([enemy(6, 6)]), dungeon: { ...floor(), exit } }
    expect(resolveTurn(occupiedFloor, { kind: 'move', destination: exit })!.status).toBe('playing')
  })
  it('charges one world turn for a future form movement rule regardless of distance', () => {
    const knightStep = (a: Cell, b: Cell) => Math.abs(a.column - b.column) === 2 && Math.abs(a.row - b.row) === 1
    const next = resolveTurn(game([]), { kind: 'move', destination: { column: 5, row: 4 } }, knightStep)!
    expect(next.turn).toBe(1)
    expect(next.cell).toEqual({ column: 5, row: 4 })
  })
})

describe('enemy perception, pathfinding, and occupancy', () => {
  it('uses obstacle-aware shortest paths and respects occupied cells', () => {
    const dungeon = floor()
    dungeon.tiles[10] = { ...dungeon.tiles[10], blocksMovement: true, blocksSight: true }
    expect(nextPathStep(dungeon, { column: 1, row: 1 }, { column: 3, row: 1 }, [])).toEqual({ column: 1, row: 0 })
    expect(nextPathStep(dungeon, { column: 1, row: 1 }, { column: 3, row: 1 }, [{ column: 1, row: 0 }])).toEqual({ column: 1, row: 2 })
  })
  it('does not see through walls, missing tiles, or wall corners', () => {
    const dungeon = floor()
    dungeon.tiles[19] = { ...dungeon.tiles[19], blocksMovement: true, blocksSight: true }
    expect(hasLineOfSight(dungeon, { column: 3, row: 1 }, { column: 3, row: 4 })).toBe(false)
    expect(hasLineOfSight(dungeon, { column: 2, row: 2 }, { column: 3, row: 3 })).toBe(false)
    const state = { ...game([enemy(3, 1)]), dungeon, cell: { column: 3, row: 4 } }
    const next = resolveTurn(state, { kind: 'wait' })!
    expect(next.enemies[0]).toMatchObject({ intent: 'idle', cell: { column: 3, row: 1 } })
    expect(next.enemies[0].lastSeen).toBeUndefined()
    expect(hasLineOfSight({ ...dungeon, tiles: dungeon.tiles.filter((tile) => cellId(tile) !== 19) }, { column: 3, row: 1 }, { column: 3, row: 4 })).toBe(false)
  })
  it('pursues a remembered position, searches, and returns to idle after losing the player', () => {
    const initial = resolveTurn(game([enemy(1, 3)]), { kind: 'wait' })!
    expect(initial.enemies[0].cell).toEqual({ column: 2, row: 3 })
    expect(initial.enemies[0].lastSeen).toEqual({ column: 3, row: 3 })
    const lostCell = { column: 7, row: 7 }
    let lost = { ...initial, cell: lostCell, ...updateFog(initial.dungeon.tiles, lostCell, initial.explored) }
    lost = resolveTurn(lost, { kind: 'wait' })!
    expect(lost.enemies[0].cell).toEqual({ column: 3, row: 3 })
    expect(lost.enemies[0].intent).toBe('search')
    for (let i = 0; i < balance.searchTurns; i++) lost = resolveTurn(lost, { kind: 'wait' })!
    expect(lost.enemies[0].intent).toBe('idle')
    expect(lost.enemies[0].lastSeen).toBeUndefined()
  })
  it('resolves multiple enemies in stable order without overlapping or entering the Pawn cell', () => {
    let state = game([enemy(5, 3), enemy(5, 4, 'rookling-2')])
    for (let i = 0; i < 10 && state.status === 'playing'; i++) {
      state = resolveTurn(state, { kind: 'defend' })!
      const cells = [state.cell, ...state.enemies.filter((e) => e.hp > 0).map((e) => e.cell)].map(cellId)
      expect(new Set(cells).size).toBe(cells.length)
    }
  })
  it('spawns on accessible generated cells across 1,000 seeds', () => {
    for (let i = 0; i < 1000; i++) {
      const state = createGame(generateDungeon(`enemy-${i}`))
      expect(state.enemies).toHaveLength(1)
      expect(state.enemies[0].cell).not.toEqual(state.cell)
      expect(state.enemies[0].cell).not.toEqual(state.dungeon.exit)
      const tile = state.dungeon.tiles.find((tile) => sameCell(tile, state.enemies[0].cell))!
      expect(tile.blocksMovement).toBe(false)
      expect(tile.prop).toBeUndefined()
    }
  })
  it('runs deterministic encounters across generated floors without collisions', () => {
    for (let seed = 0; seed < 100; seed++) {
      let state = createGame(generateDungeon(`simulation-${seed}`))
      for (let turn = 0; turn < 25 && state.status === 'playing'; turn++) {
        const targets = attackTargets(state)
        const moves = legalDestinations(state.cell, movementBoard(state))
        const action = targets.length ? { kind: 'attack', targetId: targets[0].id } as const
          : moves.length ? { kind: 'move', destination: moves[turn % moves.length] } as const : { kind: 'wait' } as const
        const next = resolveTurn(state, action)!
        expect(next).toEqual(resolveTurn(state, action))
        expect(next.turn).toBe(state.turn + 1)
        const cells = [next.cell, ...next.enemies.filter((e) => e.hp > 0).map((e) => e.cell)].map(cellId)
        expect(new Set(cells).size).toBe(cells.length)
        expect(cells.every((id) => !next.dungeon.tiles[id].blocksMovement)).toBe(true)
        state = next
      }
    }
  }, 10000)
})

describe('action playback and rapid input guards', () => {
  beforeEach(() => usePawnStore.setState({ ...game(), from: { column: 3, row: 3 }, phase: 'ready', actionId: 0, isMoving: false, revealAll: false, runActive: true }))
  afterEach(() => vi.useRealTimers())
  it('does not advance while idle or when debugging, menus, or invalid input occur', () => {
    vi.useFakeTimers()
    const before = usePawnStore.getState()
    vi.advanceTimersByTime(60000)
    expect(usePawnStore.getState()).toBe(before)
    expect(before.tryMove({ column: 4, row: 3 })).toBe(false)
    expect(before.tryAttack('unknown')).toBe(false)
    expect(usePawnStore.getState()).toBe(before)
    before.toggleReveal()
    expect(usePawnStore.getState().turn).toBe(0)
    expect(usePawnStore.getState().enemies).toBe(before.enemies)
  })
  it('locks every action type until both phases finish and rejects duplicate phase callbacks', () => {
    const { submitAction, tryMove, tryAttack, advancePlayback } = usePawnStore.getState()
    expect(submitAction({ kind: 'wait' })).toBe(true)
    const id = usePawnStore.getState().actionId
    expect(tryMove({ column: 3, row: 4 })).toBe(false)
    expect(tryAttack()).toBe(false)
    expect(submitAction({ kind: 'defend' })).toBe(false)
    advancePlayback(id, 'enemies')
    expect(usePawnStore.getState().turn).toBe(0)
    advancePlayback(id, 'player')
    expect(usePawnStore.getState().turn).toBe(1)
    expect(usePawnStore.getState().phase).toBe('enemies')
    advancePlayback(id, 'player')
    expect(usePawnStore.getState().turn).toBe(1)
    expect(submitAction({ kind: 'wait' })).toBe(false)
    advancePlayback(id, 'enemies')
    advancePlayback(id, 'enemies')
    expect(submitAction({ kind: 'defend' })).toBe(true)
  })
  it('invalidates pending callbacks during debug regeneration without advancing time', () => {
    const state = usePawnStore.getState()
    state.submitAction({ kind: 'wait' })
    const old = usePawnStore.getState().actionId
    state.loadDungeon('new-floor')
    const reset = usePawnStore.getState()
    state.advancePlayback(old, 'player')
    state.advancePlayback(old, 'enemies')
    expect(usePawnStore.getState()).toBe(reset)
    expect(reset.turn).toBe(0)
    expect(reset.phase).toBe('ready')
  })
})

describe('PAWNRIFT branding and chessboard information boundaries', () => {
  it('updates browser metadata and keeps previous slogans out of user-facing screens', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<title>PAWNRIFT</title>')
    for (const file of ['src/App.tsx', 'src/ui/TitleScreen.tsx', 'src/scenes/FoundationScene.tsx']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/Dungeon in a Box|quiet corner|A little pawn|journey starts|glimpse into/)
    }
  })
  it('preserves global checker parity across generated layouts and gaps', () => {
    expect(chessTileColors).toHaveLength(2)
    expect(chessTileColors[0]).not.toBe(chessTileColors[1])
    for (const style of layoutStyles) for (let seed = 0; seed < 30; seed++) {
      const dungeon = generateDungeon(`checker-${seed}`, style)
      for (const tile of dungeon.tiles.filter((tile) => !tile.blocksMovement)) {
        expect(checkerIndex(tile.column, tile.row)).toBe((tile.column + tile.row) % 2)
        expect(checkerIndex(tile.column + 1, tile.row)).not.toBe(checkerIndex(tile.column, tile.row))
        expect(checkerIndex(tile.column, tile.row + 1)).not.toBe(checkerIndex(tile.column, tile.row))
      }
    }
  })
  it('does not reveal unseen terrain patterns, enemies, or attack targets through memory', () => {
    const state = game([enemy(6, 6)])
    const id = cellId(state.enemies[0].cell)
    expect(tileVisibility(id, state)).toBe('hidden')
    expect(canSeeContent(id, state)).toBe(false)
    const remembered = { ...state, explored: new Set([...state.explored, id]) }
    expect(tileVisibility(id, remembered)).toBe('remembered')
    expect(canSeeContent(id, remembered)).toBe(false)
    expect(attackTargets(remembered)).toHaveLength(0)
    expect(resolvePlayerAction(remembered, { kind: 'attack', targetId: 'rookling-1' })).toBeNull()
  })
})
