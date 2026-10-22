import { describe, expect, it, vi } from 'vitest'
import { createGame, foresightIntent, resolveEnemyPhase, resolvePlayerAction, resolveTurn, type GameState, type Enemy } from '../game/logic/combat'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { activateTransformation, completeTransformationFloor, emptyTransformations, grantTransformation, type TransformationState } from '../game/logic/transformations'
import { canKnightLand, perchTiles, playerBoard, reversionReason } from '../game/logic/perching'
import { formMovement } from '../game/logic/chessMovement'
import { abilityReason, chooseAstralRegion, damageEnemy, emptySignatures, signatureFog, vaultTargets } from '../game/logic/signatures'
import type { Attunement, BossForm } from '../data/forms'
import { movementDiagram } from '../ui/MovementGuide'
import { createHoverScheduler } from '../ui/tooltipEvents'
import { tooltipPosition } from '../ui/tooltipLayout'
import { usePawnStore } from '../game/state/pawnStore'
const c = (column: number, row: number) => ({ column, row })
function forms(form: BossForm, attunement: Attunement = 'light') {
  return activateTransformation(grantTransformation(grantTransformation(emptyTransformations(), form, 'light')!, form, 'dark')!, form, attunement)!
}
function foe(id = 'a', column = 4, row = 3): Enemy {
  return { id, kind: 'rookling', cell: c(column, row), from: c(column, row), hp: 30, maxHp: 30, intent: 'idle', searchLeft: 0 }
}
function game(form?: BossForm, attunement: Attunement = 'light'): GameState {
  const dungeon: Dungeon = { seed: 'signature-fixture', style: 'courtyard', spawn: c(3, 3), exit: c(7, 7), reservations: [],
    tiles: Array.from({ length: 64 }, (_, id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
  return { ...createGame(dungeon), enemies: [foe()], transformations: form ? forms(form, attunement) : emptyTransformations() }
}
function charged(enemy = foe()): Enemy { return { ...enemy, intent: 'attack', attackTarget: c(3, 3) } }
function perch(state: GameState, position = c(4, 5)) {
  return { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => cellId(tile) === cellId(position)
    ? { ...tile, prop: 'block' as const, blocksMovement: true, perchHeight: 0.475 } : tile) } }
}

describe('Knight navigation and safe reversion', () => {
  it('walks corridors, jumps onto only designated low flat blocks, and dismounts normally', () => {
    const state = perch({ ...game('knight'), enemies: [] })
    expect(resolveTurn(state, { kind: 'move', destination: c(3, 4) })!.turn).toBe(1)
    const landed = resolveTurn(state, { kind: 'move', destination: c(4, 5) })!
    expect(landed.elevation).toBe(0.475)
    expect(resolveTurn(landed, { kind: 'move', destination: c(4, 4) })!.elevation).toBe(0)
    for (const prop of ['tree', 'wall', 'rock'] as const) {
      const invalid = { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => tile.prop ? { ...tile, prop } : tile) } }
      expect(perchTiles(invalid.dungeon)).toEqual([])
      expect(resolveTurn(invalid, { kind: 'move', destination: c(4, 5) })).toBeNull()
    }
    expect(formMovement('pawn')(state.cell, c(4, 5), playerBoard(state))).toBe(false)
  })
  it('rejects occupied, isolated, tall and out-of-bounds perches', () => {
    const state = perch(game('knight'))
    const board = playerBoard(state)
    expect(canKnightLand(c(4, 5), { ...board, occupied: [c(4, 5)] })).toBe(false)
    expect(canKnightLand(c(-1, 5), board)).toBe(false)
    expect(canKnightLand(c(4, 5), { ...board, blocked: [...board.blocked, c(3, 5), c(5, 5), c(4, 4), c(4, 6)] })).toBe(false)
    expect(perchTiles({ ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => ({ ...tile, perchHeight: 2 })) })).toEqual([])
  })
  it('safely lands a reverting Pawn, spends one turn and preserves charges; partial floor is not recovery', () => {
    const state = { ...perch(game('knight')), cell: c(4, 5), elevation: 0.475 }
    const reverted = resolveTurn(state, { kind: 'revert' })!
    expect(reverted).toMatchObject({ cell: c(4, 4), elevation: 0, turn: 1 })
    expect(reverted.transformations).toMatchObject({ active: null, recovery: 1, recoveryStartsNextFloor: true })
    expect(reverted.transformations.inventory[0].charges).toBe(4)
    expect(resolveTurn(reverted, { kind: 'revert' })).toBeNull()
    const partial = completeTransformationFloor(reverted.transformations)
    expect(partial.recovery).toBe(1)
    expect(completeTransformationFloor(partial).recovery).toBe(0)
    const trapped = { ...state, occupied: [c(4, 4), c(5, 5), c(4, 6), c(3, 5)] }
    expect(reversionReason(trapped)).toContain('No safe')
    expect(resolveTurn(trapped, { kind: 'revert' })).toBeNull()
    const final: TransformationState = { ...state.transformations, inventory: state.transformations.inventory.map((item) => ({ ...item, charges: 0 })) }
    expect(resolveTurn({ ...state, transformations: final }, { kind: 'revert' })!.transformations).toMatchObject({ inventory: [], reconstruction: { knight: 0 } })
  })
  it('enemies approach, telegraph and hit a perched Knight', () => {
    let state = { ...perch(game('knight')), cell: c(4, 5), elevation: 0.475, enemies: [foe('a', 4, 2)] }
    for (let i = 0; i < 4; i++) state = resolveTurn(state, { kind: 'wait' })!
    expect(state.hp).toBeLessThan(state.maxHp)
    expect(state.enemies[0].cell).not.toEqual(state.cell)
  })
})

describe('signatures share synchronized turns and cooldowns', () => {
  it('costs no Energy; cast turn does not tick cooldown, invalid actions are free', () => {
    const state = { ...game(), energy: 0, enemies: [] }
    const player = resolvePlayerAction(state, { kind: 'ability' })!
    expect(player.energy).toBe(0)
    const cast = resolveEnemyPhase(player)
    expect(cast.signatures.cooldowns.pawn).toBe(10)
    expect(cast.turn).toBe(1)
    expect(resolveTurn(cast, { kind: 'ability' })).toBeNull()
    expect(resolveTurn(cast, { kind: 'move', destination: c(-1, 0) })).toBeNull()
    expect(resolveTurn(cast, { kind: 'wait' })!.signatures.cooldowns.pawn).toBe(9)
    expect(state.signatures).toEqual(emptySignatures())
  })
  it('preserves cooldowns through reversion, activation and actual floors, with guarded duplicate inputs', () => {
    const base = game('rook')
    usePawnStore.setState({ ...base, runActive: true, phase: 'ready', actionId: 0 })
    const store = usePawnStore.getState()
    expect(store.submitAction({ kind: 'ability' })).toBe(true)
    expect(store.submitAction({ kind: 'ability' })).toBe(false)
    const id = usePawnStore.getState().actionId
    store.advancePlayback(id, 'player'); store.advancePlayback(id, 'player'); store.advancePlayback(id, 'enemies')
    expect(usePawnStore.getState().turn).toBe(1)
    expect(usePawnStore.getState().signatures.cooldowns.rook).toBe(9)
    const reverted = resolveTurn(usePawnStore.getState(), { kind: 'revert' })!
    expect(reverted.signatures.cooldowns.rook).toBe(8)
    usePawnStore.setState({ ...reverted, runActive: true, phase: 'ready' })
    expect(store.transitionFloor('next-signatures', true)).toBe(true)
    expect(usePawnStore.getState().signatures.cooldowns.rook).toBe(8)
    expect(usePawnStore.getState().signatures.eyeUsed).toBe(false)
  })
  it('Crimson Reversal automatically parries without retaliation and persists; normal Defend stays independent', () => {
    const state = { ...game(), enemies: [charged(), charged(foe('b', 3, 4))] }
    const cast = resolveTurn(state, { kind: 'ability' })!
    expect(cast.events.filter((e) => e.kind === 'parry')).toHaveLength(2)
    expect(cast.events.filter((e) => e.kind === 'counter')).toHaveLength(0)
    expect(cast.hp).toBe(state.hp)
    expect(resolveTurn({ ...game(), enemies: [charged()] }, { kind: 'defend' })!.events.some((e) => e.kind === 'counter')).toBe(true)
    const unused = resolveTurn({ ...game(), enemies: [] }, { kind: 'ability' })!
    expect(unused.signatures.parryReady).toBe(false)
    expect(unused.signatures.samuraiCharges).toBe(3)
    expect(resolveTurn({ ...unused, enemies: [charged()] }, { kind: 'wait' })!.hp).toBe(unused.hp)
  })
  it('Vaulting Charge validates the full leap and lance line before mutation, with distinct attunements', () => {
    for (const attunement of ['light', 'dark'] as const) {
      const state = { ...perch(game('knight', attunement)), enemies: [foe('a', 4, 4)] }
      expect(vaultTargets(state, c(4, 5))).toHaveLength(1)
      const cast = resolvePlayerAction(state, { kind: 'ability', destination: c(4, 5), targetId: 'a' })!
      expect(cast).toMatchObject({ cell: c(4, 5), elevation: 0.475, energy: 3, block: attunement === 'dark' ? 3 : 0 })
      expect(cast.enemies[0].hp).toBe(attunement === 'light' ? 25 : 27)
      expect(resolveEnemyPhase(cast).signatures.cooldowns.knight).toBe(7)
      expect(resolveTurn(state, { kind: 'ability', destination: c(3, 4), targetId: 'a' })).toBeNull()
      expect(resolveTurn({ ...state, visible: new Set([cellId(state.cell)]) }, { kind: 'ability', destination: c(4, 5), targetId: 'a' })).toBeNull()
      expect(resolveTurn({ ...state, occupied: [c(4, 5)] }, { kind: 'ability', destination: c(4, 5), targetId: 'a' })).toBeNull()
    }
  })
  it('Iron Bastion provides temporary Block and one nearby retaliation', () => {
    for (const attunement of ['light', 'dark'] as const) {
      const state = { ...game('rook', attunement), enemies: [charged(), charged(foe('b', 3, 4))] }
      const player = resolvePlayerAction(state, { kind: 'ability' })!
      expect(player.block).toBe(attunement === 'light' ? 4 : 8)
      const cast = resolveEnemyPhase(player)
      expect(cast.events.filter((e) => e.kind === 'counter').map((e) => e.amount)).toEqual([attunement === 'light' ? 5 : 2])
      expect(cast).toMatchObject({ block: 0, preparedCounter: 0, hp: 12 })
    }
  })
})

describe('Astral Eye visibility and information boundaries', () => {
  it('chooses a reproducible in-bounds 4x4 with unexplored coverage, independent of objectives', () => {
    const state = game('bishop')
    const region = chooseAstralRegion(state.dungeon, state.explored, 0)!
    expect(region).toEqual(chooseAstralRegion({ ...state.dungeon, exit: c(1, 1), reservations: [] }, state.explored, 0))
    expect(new Set(region).size).toBe(16)
    expect(region.every((id) => id >= 0 && id < 64)).toBe(true)
    expect(new Set(region.map((id) => id % 8)).size).toBe(4)
    expect(new Set(region.map((id) => Math.floor(id / 8))).size).toBe(4)
    expect(region.some((id) => !state.explored.has(id))).toBe(true)
    const full = { ...state, explored: new Set(Array.from({ length: 64 }, (_, id) => id)) }
    expect(abilityReason(full)).toContain('entire map')
    expect(resolveTurn(full, { kind: 'ability' })).toBeNull()
  })
  it('reveals entities for cast response and next response, remembers terrain and hides remote actors afterward', () => {
    const state = game('bishop')
    const region = chooseAstralRegion(state.dungeon, state.explored, 0)!
    const remote = region.find((id) => !state.visible.has(id))!
    const position = cellFromId(remote)
    const player = resolvePlayerAction({ ...state, enemies: [foe('remote', position.column, position.row)] }, { kind: 'ability' })!
    expect(player.enemies[0].exposedTurns).toBe(3)
    expect(player.visible.has(remote)).toBe(true)
    const cast = resolveEnemyPhase({ ...player, enemies: [] })
    expect(cast.signatures.reveal?.turnsLeft).toBe(1)
    expect(cast.visible.has(remote)).toBe(true)
    const expired = resolveTurn(cast, { kind: 'wait' })!
    expect(expired.signatures.reveal).toBeNull()
    expect(expired.visible.has(remote)).toBe(false)
    expect(expired.explored.has(remote)).toBe(true)
    expect(resolveTurn({ ...expired, transformations: forms('bishop', 'dark') }, { kind: 'ability' })).toBeNull()
    const target = { ...player.enemies[0] }
    expect(damageEnemy(target, 3)).toBe(5)
    expect(damageEnemy(target, 3)).toBe(3)
    let ticking = player
    for (let i = 0; i < 4; i++) ticking = resolveTurn(ticking, { kind: 'wait' })!
    expect(ticking.enemies[0].exposedTurns).toBe(0)
  })
  it('Dark foresight projects one response only and disappears with temporary sight', () => {
    const player = resolvePlayerAction(game('bishop', 'dark'), { kind: 'ability' })!
    const remote = player.signatures.reveal!.cells.find((id) => !game().visible.has(id))!
    const position = cellFromId(remote)
    const state = { ...player, enemies: [foe('remote', position.column, position.row)] }
    expect(foresightIntent(state, 'remote')).toBeDefined()
    expect(state.enemies[0].exposedTurns).toBeUndefined()
    const expired = { ...state, signatures: { ...state.signatures, reveal: null } }
    expect(foresightIntent({ ...expired, ...signatureFog(expired) }, 'remote')).toBeUndefined()
  })
})

describe('Dread Sovereign area, Fear and weakness', () => {
  it('damages only visible 3x3 foes, fears visible nearby foes, and respects boss resistance', () => {
    for (const attunement of ['light', 'dark'] as const) {
      const state = { ...game('queen', attunement), visible: new Set([cellId(c(4, 3)), cellId(c(3, 6)), cellId(c(2, 3))]),
        enemies: [charged(), foe('far', 3, 6), foe('hidden', 3, 2), { ...foe('boss', 2, 3), boss: true }] }
      const cast = resolvePlayerAction(state, { kind: 'ability' })!
      expect(cast.enemies.map((e) => e.hp)).toEqual([attunement === 'light' ? 23 : 26, 30, 30, attunement === 'light' ? 23 : 26])
      expect(cast.enemies.map((e) => e.fearTurns ?? 0)).toEqual([1, 1, 0, 0])
      const response = resolveEnemyPhase(cast)
      expect(response.enemies[0].cell).not.toEqual(state.enemies[0].cell)
      expect(response.enemies[0].intent).toBe('idle')
      expect(response.enemies[0].fearTurns).toBe(0)
      if (attunement === 'dark') {
        const weak = resolveTurn({ ...response, enemies: [charged({ ...response.enemies[0], cell: c(4, 3) })] }, { kind: 'wait' })!
        expect(weak.hp).toBe(response.hp - 1)
        expect(weak.enemies[0].weakenedDamage).toBe(0)
      }
    }
  })
  it('trapped Fear hesitates without attack or overlap; no eligible foe makes activation free-invalid', () => {
    const state = game('queen')
    const cast = resolvePlayerAction(state, { kind: 'ability' })!
    const response = resolveEnemyPhase({ ...cast, occupied: [c(5, 3), c(4, 2), c(4, 4)] })
    expect(response.hp).toBe(12)
    expect(response.enemies[0].cell).toEqual(c(4, 3))
    expect(response.events.some((e) => e.kind === 'fear')).toBe(true)
    expect(resolveTurn({ ...state, enemies: [] }, { kind: 'ability' })).toBeNull()
  })
})

describe('deliberate instructional UI', () => {
  it('shows exactly 25 squares with distinct Knight walk/leap destinations', () => {
    expect(movementDiagram('knight')).toHaveLength(25)
    expect(movementDiagram('knight').filter((s) => s.kind === 'walk')).toHaveLength(4)
    expect(movementDiagram('knight').filter((s) => s.kind === 'leap')).toHaveLength(8)
    for (const form of ['bishop', 'rook', 'queen'] as const) expect(movementDiagram(form).filter((s) => s.kind === 'slide')).toHaveLength(form === 'queen' ? 16 : 8)
  })
  it('delays hover 300ms and cancels quick pointer passes', () => {
    vi.useFakeTimers()
    try {
      const show = vi.fn(), scheduler = createHoverScheduler(show)
      scheduler.queue('first'); vi.advanceTimersByTime(299); expect(show).not.toHaveBeenCalled()
      scheduler.cancel(); vi.advanceTimersByTime(1); expect(show).not.toHaveBeenCalled()
      scheduler.queue('second'); vi.advanceTimersByTime(300); expect(show).toHaveBeenCalledExactlyOnceWith('second')
    } finally { vi.useRealTimers() }
  })
  it('moves tooltips away from essential side-panel controls at desktop sizes', () => {
    for (const width of [1024, 1280, 1440, 1920]) {
      const panel = { left: width - 320, top: 180, width: 300, height: 300 }
      const result = tooltipPosition({ left: width - 250, top: 200, bottom: 225, width: 24 }, { width: 280, height: 120 }, { width, height: 768 }, [panel])
      expect(result.left + 280).toBeLessThanOrEqual(panel.left)
      expect(result.top).toBeGreaterThanOrEqual(12)
    }
  })
})
