import { describe, expect, it } from 'vitest'
import { bossForms, formBalance, type Attunement, type BossForm } from '../data/forms'
import { activateTransformation, activationReason, completeTransformationFloor, emptyTransformations, grantTransformation, recordTransformationBossWin, retainAfterDeath, retentionChoices, transformationsForNewRun, type TransformationState } from '../game/logic/transformations'
import { chessDestinations, formMovement } from '../game/logic/chessMovement'
import { createGame, resolvePlayerAction, resolveTurn, type GameState } from '../game/logic/combat'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { formAttackTargets, movementPreviews } from '../game/logic/formCombat'
import { canSeeContent } from '../game/logic/visibility'

const cell = (column: number, row: number) => ({ column, row })
const board = { size: 8, occupied: [], blocked: [], available: Array.from({ length: 64 }, (_, id) => cellFromId(id)) }
function owned(...forms: BossForm[]) {
  return forms.reduce((state, form) => grantTransformation(grantTransformation(state, form, 'light')!, form, 'dark')!, emptyTransformations())
}
function game(form: BossForm = 'knight', attunement: Attunement = 'light'): GameState {
  const dungeon: Dungeon = { seed: 'form-combat', style: 'courtyard', spawn: cell(3, 3), exit: cell(7, 7), reservations: [],
    tiles: board.available.map((position) => ({ ...position, blocksMovement: false, blocksSight: false, rotation: 0 })) }
  return { ...createGame(dungeon), transformations: activateTransformation(owned(form), form, attunement)!,
    enemies: [{ id: 'target', kind: 'rookling', cell: cell(4, 3), from: cell(4, 3), hp: 30, maxHp: 30, intent: 'idle', searchLeft: 0 }] }
}

describe('transformation consumable lifecycle', () => {
  it('shares a pool between attunements, spends only on activation and allows only two identities', () => {
    const state = owned('knight', 'bishop')
    expect(state.inventory).toHaveLength(2)
    expect(grantTransformation(state, 'rook', 'light')).toBeNull()
    const active = activateTransformation(state, 'knight', 'dark')!
    expect(active.inventory[0]).toMatchObject({ charges: 4, attunements: ['light', 'dark'] })
    expect(active.active).toMatchObject({ form: 'knight', attunement: 'dark', floorsLeft: 2 })
    expect(activateTransformation(active, 'bishop', 'light')).toBeNull()
    expect(activationReason(active, 'bishop', 'light')).toBe('Already transformed.')
    expect(grantTransformation(active, 'knight', 'light')!.inventory[0].charges).toBe(4)
    expect(state.inventory[0].charges).toBe(5)
    expect(activateTransformation(grantTransformation(emptyTransformations(), 'rook', 'light')!, 'rook', 'dark')).toBeNull()
  })
  it('counts the activation floor and next floor, then enforces a full global Pawn recovery floor', () => {
    const active = activateTransformation(owned('knight', 'bishop'), 'knight', 'light')!
    const secondFloor = completeTransformationFloor(active)
    expect(secondFloor.active?.floorsLeft).toBe(1)
    const recovery = completeTransformationFloor(secondFloor)
    expect(recovery.active).toBeNull()
    expect(recovery.recovery).toBe(1)
    expect(activateTransformation(recovery, 'bishop', 'dark')).toBeNull()
    const ready = completeTransformationFloor(recovery)
    expect(ready.recovery).toBe(0)
    expect(activateTransformation(ready, 'bishop', 'dark')).not.toBeNull()
  })
  it('destroys an exhausted item only at activation end; two later boss wins reconstruct then reacquire', () => {
    let state: TransformationState = owned('knight')
    for (let charge = 4; charge >= 0; charge--) {
      state = activateTransformation(state, 'knight', charge % 2 ? 'dark' : 'light')!
      expect(state.inventory[0].charges).toBe(charge)
      expect(state.active?.floorsLeft).toBe(2)
      state = completeTransformationFloor(state)
      expect(state.inventory).toHaveLength(1)
      state = completeTransformationFloor(state)
      expect(state.inventory.length).toBe(charge === 0 ? 0 : 1)
      state = completeTransformationFloor(state)
    }
    expect(state.reconstruction.knight).toBe(0)
    expect(grantTransformation(state, 'knight', 'light')).toBeNull()
    const first = recordTransformationBossWin(state, 'knight', 'dark')
    expect(first.reconstruction.knight).toBe(1)
    expect(first.inventory).toHaveLength(0)
    const second = recordTransformationBossWin(first, 'knight', 'light')
    expect(second.inventory[0]).toMatchObject({ form: 'knight', charges: 5 })
    expect(second.reconstruction.knight).toBeUndefined()
    expect(JSON.parse(JSON.stringify(second))).toEqual(second)
  })
  it('keeps reconstructed eligibility separate from a full inventory', () => {
    const state = { ...owned('bishop', 'rook'), reconstruction: { knight: 1 as const } }
    const ready = recordTransformationBossWin(state, 'knight', 'light')
    expect(ready.inventory).toHaveLength(2)
    expect(ready.reconstruction.knight).toBe(2)
    expect(grantTransformation(ready, 'knight', 'light')).toBeNull()
    const space = { ...ready, inventory: ready.inventory.slice(0, 1) }
    expect(grantTransformation(space, 'knight', 'light')!.inventory[1].charges).toBe(5)
  })
  it('retains exactly one eligible item with its charges and global recovery after death', () => {
    const active = activateTransformation(owned('knight', 'bishop'), 'knight', 'light')!
    expect(retainAfterDeath(active)).toBeNull()
    expect(retainAfterDeath(active, 'rook')).toBeNull()
    const retained = retainAfterDeath(active, 'knight')!
    expect(retained.inventory).toHaveLength(1)
    expect(retained.inventory[0].charges).toBe(4)
    expect(retained.active).toBeNull()
    expect(retained.recovery).toBe(1)
    expect(transformationsForNewRun(retained)).toEqual(retained)
    const recovering = { ...owned('bishop'), recovery: 1 }
    expect(retainAfterDeath(recovering, 'bishop')!.recovery).toBe(1)
  })
  it('does not retain a zero-charge final activation and preserves reconstruction on death', () => {
    const final = { ...owned('rook'), inventory: [{ form: 'rook' as const, charges: 1, attunements: ['dark' as const] }] }
    const active = activateTransformation(final, 'rook', 'dark')!
    expect(retentionChoices(active)).toEqual([])
    const dead = retainAfterDeath(active)!
    expect(dead.inventory).toEqual([])
    expect(dead.active).toBeNull()
    expect(dead.recovery).toBe(1)
    expect(dead.reconstruction.rook).toBe(0)
    expect(retainAfterDeath({ ...emptyTransformations(), reconstruction: { queen: 1 } })!.reconstruction.queen).toBe(1)
  })
})

describe('chess movement and fog-safe previews', () => {
  it('implements all five forms and configurable slide limits', () => {
    const from = cell(3, 3)
    expect(chessDestinations('pawn', from, board)).toHaveLength(4)
    expect(chessDestinations('knight', from, board)).toHaveLength(12)
    for (const form of ['bishop', 'rook', 'queen'] as const) {
      expect(formMovement(form)(from, cell(form === 'bishop' ? 6 : 3, 6), board)).toBe(true)
      expect(formMovement(form)(from, cell(form === 'bishop' ? 7 : 3, 7), board)).toBe(false)
      expect(formMovement(form)(from, from, board)).toBe(false)
    }
    expect(formMovement('bishop')(from, cell(3, 4), board)).toBe(false)
    expect(formMovement('rook')(from, cell(4, 4), board)).toBe(false)
    expect(formMovement('queen')(from, cell(6, 6), board)).toBe(true)
    expect(formMovement('pawn')(from, cell(4, 4), board)).toBe(false)
    expect(formMovement('knight')(from, cell(4, 4), board)).toBe(false)
  })
  it('jumps intermediate obstacles only as Knight, never onto blocked/occupied/out-of-bounds cells', () => {
    const blocked = { ...board, blocked: [cell(3, 4), cell(4, 4)] }
    expect(formMovement('knight')(cell(3, 3), cell(4, 5), blocked)).toBe(true)
    for (const key of ['blocked', 'occupied'] as const) {
      expect(formMovement('knight')(cell(3, 3), cell(4, 5), { ...board, [key]: [cell(4, 5)] })).toBe(false)
      expect(formMovement('rook')(cell(3, 3), cell(3, 6), { ...board, [key]: [cell(3, 4)] })).toBe(false)
      expect(formMovement('bishop')(cell(3, 3), cell(6, 6), { ...board, [key]: [cell(4, 4)] })).toBe(false)
      expect(formMovement('queen')(cell(3, 3), cell(6, 6), { ...board, [key]: [cell(4, 4)] })).toBe(false)
    }
    expect(formMovement('knight')(cell(0, 0), cell(-1, 2), board)).toBe(false)
  })
  it('unknown walls/enemies never change previews; actual collision still rejects the move without a turn', () => {
    const state = { ...game(), enemies: [] }
    const target = cell(4, 5)
    expect(canSeeContent(cellId(target), state)).toBe(false)
    const hidden = { ...state, enemies: [{ ...game().enemies[0], cell: target }], dungeon: { ...state.dungeon,
      tiles: state.dungeon.tiles.map((tile) => cellId(tile) === cellId(target) ? { ...tile, blocksMovement: true, blocksSight: true } : tile) } }
    expect(movementPreviews(state)).toEqual(movementPreviews(hidden))
    expect(movementPreviews(hidden).find((preview) => cellId(preview) === cellId(target))?.uncertain).toBe(true)
    expect(resolveTurn(hidden, { kind: 'move', destination: target })).toBeNull()
    const moved = resolveTurn(state, { kind: 'move', destination: target })!
    expect(moved.turn).toBe(1)
    expect(moved.visible.has(cellId(target))).toBe(true)
    expect(moved.transformations.inventory[0].charges).toBe(4)
    expect(moved.transformations.active?.floorsLeft).toBe(2)
  })
})

describe('form combat, attunements and synchronized turns', () => {
  it('every form movement resolves as exactly one turn, and Slip keeps its ordinary one-tile rule', () => {
    for (const form of ['pawn', ...bossForms] as const) {
      const base = game(form === 'pawn' ? 'knight' : form)
      const state = { ...base, enemies: [], transformations: form === 'pawn' ? emptyTransformations() : base.transformations }
      const destination = form === 'pawn' ? cell(3, 4) : form === 'knight' ? cell(4, 5)
        : form === 'rook' ? cell(3, 6) : cell(6, 6)
      const moved = resolveTurn(state, { kind: 'move', destination })!
      expect(moved.turn).toBe(1)
      expect(moved.cell).toEqual(destination)
      expect(resolveTurn(state, { kind: 'move', destination: cell(8, 8) })).toBeNull()
    }
    const state = { ...game(), enemies: [] }
    const all = [...state.deck.hand, ...state.deck.draw]
    const slip = all.find((card) => card.definitionId === 'slip')!
    const moved = resolveTurn({ ...state, deck: { ...state.deck, hand: [slip], draw: all.filter((card) => card !== slip), discard: [] } },
      { kind: 'card', cardInstanceId: slip.instanceId, target: { kind: 'tile', cell: cell(3, 4) } })!
    expect(moved.cell).toEqual(cell(3, 4))
    expect(moved.turn).toBe(1)
    expect(moved.transformations.inventory[0].charges).toBe(4)
  })
  it('activation is a single guarded action with exactly one enemy response and no Energy cost', () => {
    const state = { ...game(), transformations: owned('knight') }
    const before = structuredClone(state)
    const next = resolveTurn(state, { kind: 'transform', form: 'knight', attunement: 'light' })!
    expect(next.turn).toBe(1)
    expect(next.transformations.inventory[0].charges).toBe(4)
    expect(next.events.filter((event) => event.actor === 'target')).toHaveLength(1)
    expect(state).toEqual(before)
    expect(resolveTurn(next, { kind: 'transform', form: 'knight', attunement: 'dark' })).toBeNull()
  })
  it('all transformed basics remain reliable and free, with Light damage versus Dark block', () => {
    for (const form of bossForms) {
      const base = game(form)
      const targetCell = form === 'bishop' ? cell(4, 4) : cell(4, 3)
      for (const attunement of ['light', 'dark'] as const) {
        const state = { ...base, energy: 0, transformations: activateTransformation(owned(form), form, attunement)!,
          enemies: [{ ...base.enemies[0], cell: targetCell }] }
        const player = resolvePlayerAction(state, { kind: 'attack', targetId: 'target' })!
        expect(player.enemies[0].hp).toBe(30 - formBalance[form].damage - (attunement === 'light' ? 1 : 0))
        expect(player.block).toBe((form === 'rook' ? 2 : 0) + (attunement === 'dark' ? 1 : 0))
        expect(player.energy).toBe(0)
        expect(resolveTurn(state, { kind: 'attack', targetId: 'target' })!.turn).toBe(1)
      }
    }
  })
  it('Knight basics respect clear straight lanes and two-tile range', () => {
    const base = game('knight')
    const state = { ...base, visible: new Set(Array.from({ length: 64 }, (_, id) => id)), enemies: [{ ...base.enemies[0], cell: cell(3, 5) }] }
    expect(formAttackTargets(state)).toHaveLength(1)
    expect(formAttackTargets({ ...state, occupied: [cell(3, 4)] })).toEqual([])
    expect(resolveTurn({ ...state, visible: new Set([cellId(state.cell)]) }, { kind: 'attack', targetId: 'target' })).toBeNull()
  })
  it('cards keep Pawn targeting and formulas in every form, with no form damage/block modifier', () => {
    for (const form of bossForms) {
      const state = game(form, 'dark')
      const all = [...state.deck.hand, ...state.deck.draw]
      const cut = all.find((card) => card.definitionId === 'cut')!
      const deck = { ...state.deck, hand: [cut], draw: all.filter((card) => card !== cut), discard: [] }
      const next = resolvePlayerAction({ ...state, deck }, { kind: 'card', cardInstanceId: cut.instanceId, target: { kind: 'enemy', enemyId: 'target' } })!
      expect(next.enemies[0].hp).toBe(26)
      expect(next.block).toBe(0)
      expect(next.transformations.inventory[0].charges).toBe(4)
    }
  })
})
