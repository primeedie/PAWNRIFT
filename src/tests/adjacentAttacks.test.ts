import { describe, expect, it } from 'vitest'
import { bossForms, type ChessForm } from '../data/forms'
import { attackTargets, createGame, resolvePlayerAction, resolveTurn, type Enemy, type GameState } from '../game/logic/combat'
import { cardOptions } from '../game/logic/cardRules'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { movementPreviews } from '../game/logic/formCombat'
import { activateTransformation, emptyTransformations, grantTransformation } from '../game/logic/transformations'
import { updateFog } from '../game/logic/visibility'

const c = (column: number, row: number) => ({ column, row })
const neighbors = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].filter((dx) => dx || dy).map((dx) => c(3 + dx, 3 + dy)))
function enemy(cell: ReturnType<typeof c>, id = `enemy-${cellId(cell)}`): Enemy {
  return { id, cell, from: cell, kind: 'rookling', hp: 30, maxHp: 30, intent: 'idle', searchLeft: 0 }
}
function game(form: ChessForm = 'pawn'): GameState {
  const dungeon: Dungeon = { seed: 'adjacent-attacks', style: 'courtyard', spawn: c(3, 3), exit: c(7, 7), reservations: [],
    tiles: Array.from({ length: 64 }, (_, id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
  return { ...createGame(dungeon), enemies: neighbors.map((cell) => enemy(cell)),
    transformations: form === 'pawn' ? emptyTransformations()
      : activateTransformation(grantTransformation(emptyTransformations(), form, 'light')!, form, 'light')! }
}

describe('ordinary eight-neighbor melee is single-target', () => {
  it.each(['pawn', 'rook', 'queen'] as const)('%s uses its form-specific neighbor directions, with exactly one world response', (form) => {
    const state = game(form), before = structuredClone(state)
    expect(attackTargets(state).map((target) => target.cell)).toEqual(form === 'queen' ? neighbors : neighbors.filter((cell) => cell.column === 3 || cell.row === 3))
    expect(movementPreviews(state).some((cell) => neighbors.some((neighbor) => cellId(neighbor) === cellId(cell)))).toBe(false)
    for (const target of attackTargets(state)) {
      const action = { kind: 'attack', targetId: target.id } as const
      const player = resolvePlayerAction(state, action)!
      expect(player.enemies.filter((entry) => entry.hp < 30).map((entry) => entry.id)).toEqual([target.id])
      expect(player.events.filter((event) => event.kind === 'hit' && event.actor === 'pawn')).toHaveLength(1)
      const next = resolveTurn(state, action)!
      expect(next.turn).toBe(state.turn + 1)
      expect(next.events.filter((event) => event.kind === 'windup')).toHaveLength(4)
      expect(next.enemies.filter((entry) => entry.hp < 30).map((entry) => entry.id)).toEqual([target.id])
      for (const actor of state.enemies) expect(next.events.filter((event) => event.actor === actor.id).length).toBeLessThanOrEqual(1)
    }
    expect(state).toEqual(before)
  })
  it('rejects hidden, remembered-only, dead, distant, blocked, occupied and missing-tile targets for free', () => {
    const base = game(), target = base.enemies.find((entry) => cellId(entry.cell) === cellId(c(4, 4)))!
    const variants: GameState[] = [
      { ...base, visible: new Set([...base.visible].filter((id) => id !== cellId(target.cell))) },
      { ...base, enemies: [{ ...target, hp: 0 }] },
      { ...base, enemies: [{ ...target, cell: c(5, 3) }], visible: new Set(Array.from({ length: 64 }, (_, id) => id)) },
      { ...base, occupied: [target.cell] },
      { ...base, dungeon: { ...base.dungeon, tiles: base.dungeon.tiles.filter((tile) => cellId(tile) !== cellId(target.cell)) } },
      ...['wall', 'block', 'tree', 'rock'].map((prop) => ({ ...base, dungeon: { ...base.dungeon,
        tiles: base.dungeon.tiles.map((tile) => cellId(tile) === cellId(target.cell)
          ? { ...tile, blocksMovement: true, blocksSight: prop === 'wall', prop: prop as 'wall' } : tile) } })),
    ]
    for (const state of variants) {
      const before = structuredClone(state)
      expect(attackTargets(state).some((entry) => entry.id === target.id)).toBe(false)
      expect(resolveTurn(state, { kind: 'attack', targetId: target.id })).toBeNull()
      expect(state).toEqual(before)
    }
  })
  it('wall corners block diagonal targeting with normal fog and temporary reveals alike', () => {
    const base = game(), target = base.enemies.find((entry) => cellId(entry.cell) === cellId(c(4, 4)))!
    for (const flank of [c(4, 3), c(3, 4)]) {
      const dungeon = { ...base.dungeon, tiles: base.dungeon.tiles.map((tile) => cellId(tile) === cellId(flank)
        ? { ...tile, blocksMovement: true, blocksSight: true, prop: 'wall' as const } : tile) }
      const state = { ...base, dungeon, ...updateFog(dungeon.tiles, base.cell) }
      expect(state.visible.has(cellId(target.cell))).toBe(false)
      expect(resolveTurn(state, { kind: 'attack', targetId: target.id })).toBeNull()
      expect(resolveTurn({ ...state, visible: base.visible }, { kind: 'attack', targetId: target.id })).toBeNull()
    }
  })
  it('preserves Knight straight range 2 and Bishop diagonal reach 1', () => {
    for (const form of ['knight', 'bishop'] as const) {
      const base = game(form), target = enemy(form === 'bishop' ? c(4, 4) : c(5, 3))
      const state = { ...base, enemies: [target], visible: new Set(Array.from({ length: 64 }, (_, id) => id)) }
      expect(attackTargets(state)).toEqual([target])
      expect(resolveTurn(state, { kind: 'attack', targetId: target.id })!.turn).toBe(1)
      const offPattern = { ...target, cell: form === 'bishop' ? c(5, 5) : c(4, 4) }
      expect(attackTargets({ ...state, enemies: [offPattern] })).toEqual([])
      expect(attackTargets({ ...state, occupied: [form === 'bishop' ? c(4, 4) : c(4, 3)] })).toEqual([])
    }
  })
})

describe('adjacent damage cards preserve one selected victim', () => {
  it.each(['pawn', ...bossForms] as const)('Cut and Crimson target any neighbor in %s form without area damage', (form) => {
    const base = game(form), cards = [...base.deck.hand, ...base.deck.draw]
    for (const definitionId of ['cut', 'crimson']) {
      const card = cards.find((entry) => entry.definitionId === definitionId)!
      const state = { ...base, deck: { ...base.deck, hand: [card], draw: cards.filter((entry) => entry !== card), discard: [] } }
      expect(cardOptions(state, card.instanceId).targets).toHaveLength(8)
      for (const target of state.enemies) {
        const next = resolveTurn(state, { kind: 'card', cardInstanceId: card.instanceId, target: { kind: 'enemy', enemyId: target.id } })!
        expect(next.turn).toBe(1)
        expect(next.enemies.filter((entry) => entry.hp < 30).map((entry) => entry.id)).toEqual([target.id])
      }
    }
  })
})
