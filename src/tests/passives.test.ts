import { beforeEach, describe, expect, it } from 'vitest'
import { bossForms, testForms, type Attunement, type ChessForm } from '../data/forms'
import { attackTargets, createGame, resolvePlayerAction, resolveTurn, type Enemy, type GameState } from '../game/logic/combat'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { activateTransformation, completeTransformationFloor, emptyTransformations, grantTransformation, recordTransformationBossWin } from '../game/logic/transformations'
import { damageAttack } from '../game/logic/damage'
import { applyBleed, applyBurn, applyConcussion, emptyPassives, smiteBudget, splitBonus } from '../game/logic/passives'
import { applyPlaytest } from '../game/logic/playtesting'
import { usePawnStore } from '../game/state/pawnStore'
import { combatIndicator, visibleEnemies } from '../game/logic/combatIndicators'

const c = (column: number, row: number) => ({ column, row })
const all = new Set(Array.from({ length: 64 }, (_, id) => id))
function foe(id = 'target', cell = c(4, 3)): Enemy {
  return { id, cell, from: cell, hp: 200, maxHp: 200, kind: 'rookling', intent: 'idle', searchLeft: 0 }
}
function game(form: ChessForm = 'pawn', attunement: Attunement = 'light'): GameState {
  const dungeon: Dungeon = { seed: 'passive-fixture', style: 'courtyard', spawn: c(3, 3), exit: c(7, 7), reservations: [],
    tiles: [...all].map((id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
  return { ...createGame(dungeon), hp: 1000, maxHp: 1000, enemies: [foe()],
    transformations: form === 'pawn' ? emptyTransformations()
      : activateTransformation(grantTransformation(emptyTransformations(), form, attunement)!, form, attunement)! }
}
const hit = (state: GameState, targetId = 'target') => resolveTurn(state, { kind: 'attack', targetId })!
const wait = (state: GameState) => resolveTurn(state, { kind: 'wait' })!
const impacts = (state: GameState) => state.events.filter((event) => event.kind === 'hit' && event.actor === 'pawn')
function holding(state: GameState, definitionId: 'cut' | 'crimson') {
  const cards = [...state.deck.hand, ...state.deck.draw, ...state.deck.discard], card = cards.find((card) => card.definitionId === definitionId)!
  return { state: { ...state, energy: 3, deck: { ...state.deck, hand: [card], draw: cards.filter((entry) => entry !== card), discard: [] } }, card }
}

describe('Stage 7A.4 form-specific basic attacks', () => {
  it('keeps independent card directions, movement and signature rules', () => {
    const neighbors = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].filter((dx) => dx || dy).map((dx) => foe(`${dx}:${dy}`, c(3 + dx, 3 + dy))))
    for (const form of ['pawn', ...testForms] as const) {
      const state = { ...game(form), enemies: neighbors }
      expect(attackTargets(state)).toHaveLength(['pawn', 'knight', 'rook'].includes(form) ? 4 : 8)
      if (['pawn', 'knight', 'rook'].includes(form)) expect(resolveTurn(state, { kind: 'attack', targetId: '-1:-1' })).toBeNull()
    }
  })
})

describe('Sharpener and shared mitigation', () => {
  it('uses previous stacks, caps at 5, emits separate delayed impacts and advances one response only', () => {
    let state = game()
    for (let count = 0; count < 8; count++) {
      const before = structuredClone(state), next = hit(state), bonus = Math.min(count, 5)
      expect(next.turn).toBe(state.turn + 1)
      expect(impacts(next).map((event) => event.amount)).toEqual(bonus ? [3, bonus] : [3])
      expect(next.passives.sharpener).toBe(Math.min(count + 1, 5))
      expect(next.events.filter((event) => event.actor === 'target')).toHaveLength(1)
      if (bonus) expect(impacts(next)[1]).toMatchObject({ effect: 'sharpener', delayMs: 430 })
      expect(state).toEqual(before)
      state = next
    }
  })
  it('does not follow up on killed targets or build stacks on cards, invalid input, or other forms', () => {
    const base = game(), state = { ...base, passives: { ...base.passives, sharpener: 5 }, enemies: [{ ...foe(), hp: 2 }] }
    expect(impacts(hit(state))).toHaveLength(1)
    expect(resolveTurn(base, { kind: 'attack', targetId: 'missing' })).toBeNull()
    for (const form of testForms) expect(hit(game(form)).passives.sharpener).toBe(0)
    const transformed = game('knight')
    const preserved = hit({ ...transformed, passives: { ...transformed.passives, sharpener: 5 } })
    expect(impacts(preserved).map((event) => event.amount)).toEqual([4])
    expect(preserved.passives.sharpener).toBe(5)
    const { state: cardState, card } = holding({ ...base, passives: { ...base.passives, sharpener: 5 } }, 'cut')
    const next = resolveTurn(cardState, { kind: 'card', cardInstanceId: card.instanceId, target: { kind: 'enemy', enemyId: 'target' } })!
    expect(impacts(next).map((event) => event.amount)).toEqual([4, 3])
    expect(next.passives.sharpener).toBe(5)
  })
  it('charges flat defense once across split impacts and consumes Block without inaccurate HP numbers', () => {
    const enemy = { ...foe(), defense: 2, block: 2 }
    expect(damageAttack(enemy, [3, 3]).map((impact) => [impact.damage, impact.blocked])).toEqual([[0, 1], [2, 1]])
    expect(enemy.hp).toBe(198)
    expect(enemy.block).toBe(0)
    const state = game(), snapshot = structuredClone(state)
    const played = resolvePlayerAction({ ...state, passives: { ...state.passives, sharpener: 3 }, enemies: [{ ...foe(), defense: 2, block: 2 }] }, { kind: 'attack', targetId: 'target' })!
    expect(impacts(played).map((event) => event.amount)).toEqual([0, 2])
    expect(state).toEqual(snapshot)
  })
  it('adds a capped skill follow-up to Crimson Reversal without generating a stack or extra counter', () => {
    const state = { ...game(), passives: { ...emptyPassives(), sharpener: 5 }, enemies: [{ ...foe(), intent: 'attack' as const, attackTarget: c(3, 3) }] }
    const next = resolveTurn(state, { kind: 'ability' })!
    expect(next.events.filter((event) => event.kind === 'counter')).toHaveLength(1)
    expect(impacts(next)).toMatchObject([{ amount: 3, effect: 'sharpener' }])
    expect(next.passives.sharpener).toBe(5)
    expect(next.turn).toBe(1)
  })
})

describe('Sky Piercer', () => {
  it('ignores 10% of defense, rounded down, but never bypasses Block or increases other attacks', () => {
    const state = { ...game('knight'), visible: all, enemies: [{ ...foe('target', c(5, 3)), defense: 10, block: 2 }], focus: 20 }
    const next = resolvePlayerAction(state, { kind: 'attack', targetId: 'target' })!
    expect(impacts(next)[0]).toMatchObject({ amount: 13, blocked: 2, penetrated: 1, effect: 'pierce' })
    const { state: cardState, card } = holding(state, 'cut')
    const cardNext = resolvePlayerAction({ ...cardState, enemies: [{ ...state.enemies[0], cell: c(4, 3) }] },
      { kind: 'card', cardInstanceId: card.instanceId, target: { kind: 'enemy', enemyId: 'target' } })!
    expect(impacts(cardNext)[0].penetrated).toBe(0)
    expect(resolveTurn({ ...state, occupied: [c(4, 3)] }, { kind: 'attack', targetId: 'target' })).toBeNull()
  })
})

describe('Swish and Burn', () => {
  it('splashes at most two visible eligible neighbors in stable ID order, with no chaining', () => {
    const state = { ...game('bishop'), enemies: [foe(), foe('c', c(3, 2)), foe('b', c(4, 4)), foe('a', c(4, 2)), foe('hidden', c(5, 3))] }
    const next = resolvePlayerAction(state, { kind: 'attack', targetId: 'target' })!
    expect(impacts(next).map((event) => [event.targetId, event.amount])).toEqual([['target', 3], ['a', 1], ['b', 1]])
    expect(next.enemies.filter((enemy) => enemy.burn).map((enemy) => enemy.id)).toEqual(['target'])
    const rock = { ...state, visible: all, enemies: [foe(), foe('secondary', c(3, 2))], dungeon: { ...state.dungeon,
      tiles: state.dungeon.tiles.map((tile) => cellId(tile) === cellId(c(4, 2)) ? { ...tile, blocksMovement: true, prop: 'rock' as const } : tile) } }
    expect(impacts(resolvePlayerAction(rock, { kind: 'attack', targetId: 'target' })!).map((event) => event.targetId)).toEqual(['target'])
  })
  it.each(['light', 'dark'] as const)('uses checker parity, not %s attunement, and ticks exactly twice after application', (attunement) => {
    let state = hit(game('bishop', attunement))
    expect(state.enemies[0].burn?.turnsLeft).toBe(2)
    expect(impacts(state).some((event) => event.effect === 'burn')).toBe(false)
    const hp = state.enemies[0].hp
    state = wait(state)
    expect(state.enemies[0].hp).toBe(hp - 1)
    state = wait(state)
    expect(state.enemies[0].hp).toBe(hp - 2)
    expect(state.enemies[0].burn).toBeUndefined()
    expect(wait(state).enemies[0].hp).toBe(hp - 2)
    const diagonal = hit({ ...game('bishop', attunement), enemies: [foe('target', c(4, 4))] })
    expect(diagonal.enemies[0].burn).toBeUndefined()
  })
  it('refreshes one Burn instead of stacking intensity, and hidden DoTs do not expose entities', () => {
    const state = { ...game('bishop'), enemies: [foe('target', c(6, 6))] }, target = state.enemies[0]
    applyBurn(target, 0); applyBurn(target, 1)
    expect(target.burn).toEqual({ turnsLeft: 2, appliedTurn: 1 })
    const hidden = { ...state, turn: 2, visible: new Set([cellId(state.cell)]), explored: all }
    const next = wait(hidden)
    const dots = next.events.filter((event) => event.effect === 'burn')
    expect(dots).toHaveLength(1)
    expect(dots[0].seen).toBe(false)
    expect(combatIndicator(dots[0])).toBeNull()
    expect(visibleEnemies(hidden)).toEqual([])
  })
})

describe('Stun Strike response boundaries', () => {
  it.each([['normal', 1, 2], ['elite', 2, 3], ['boss', 3, 5]] as const)('%s gets %i responses, skips once, then has %i immune turns', (rank, delay, immunity) => {
    let state: GameState = { ...game('rook'), enemies: [{ ...foe(), elite: rank === 'elite', boss: rank === 'boss' }] }
    for (let response = 0; response < delay; response++) {
      state = hit(state)
      expect(state.enemies[0].concussion).toBe(delay - response - 1)
      expect(state.events.some((event) => event.kind === 'stun')).toBe(false)
    }
    state = hit(state)
    expect(state.events.filter((event) => event.kind === 'stun')).toHaveLength(1)
    expect(state.events.filter((event) => event.actor === 'target')).toHaveLength(1)
    expect(state.enemies[0].stunImmunity).toBe(immunity)
    for (let turn = 0; turn < immunity; turn++) {
      state = hit(state)
      expect(state.enemies[0].concussion).toBeUndefined()
      expect(state.enemies[0].stunImmunity).toBe(immunity - turn - 1)
      expect(state.events.some((event) => event.kind === 'stun')).toBe(false)
    }
    expect(hit(state).enemies[0].concussion).toBe(delay - 1)
  })
  it('pauses countdown at uninterruptible transitions, and retaliation never applies Concussion', () => {
    let state = hit({ ...game('rook'), enemies: [{ ...foe(), uninterruptible: true, boss: true }] })
    expect(state.enemies[0].concussion).toBe(3)
    for (let i = 0; i < 4; i++) state = wait(state)
    expect(state.enemies[0].concussion).toBe(3)
    state.enemies[0].uninterruptible = false
    expect(wait(state).enemies[0].concussion).toBe(2)
    let immune: GameState = { ...game('rook'), enemies: [{ ...foe(), uninterruptible: true, stunImmunity: 2 }] }
    immune = wait(immune); expect(immune.enemies[0].stunImmunity).toBe(1)
    immune = wait(immune); expect(immune.enemies[0].stunImmunity).toBe(0)
    const countered = resolveTurn({ ...game('rook'), enemies: [{ ...foe(), intent: 'attack', attackTarget: c(3, 3) }] }, { kind: 'ability' })!
    expect(countered.enemies[0].concussion).toBeUndefined()
  })
})

describe('Severance independent stack lifetimes', () => {
  it('never ticks on application; each stack gets three future ticks and full stacks never refresh', () => {
    let state = game('queen')
    state = hit(state); expect(state.enemies[0].bleed?.map((stack) => stack.turnsLeft)).toEqual([3])
    state = hit(state); expect(state.enemies[0].bleed?.map((stack) => stack.turnsLeft)).toEqual([2, 3])
    state = hit(state); expect(state.enemies[0].bleed?.map((stack) => stack.turnsLeft)).toEqual([1, 2, 3])
    state = hit(state); expect(state.enemies[0].bleed?.map((stack) => stack.turnsLeft)).toEqual([1, 2])
    expect(impacts(state).find((event) => event.effect === 'bleed')?.amount).toBe(6)
    state = wait(state); expect(state.enemies[0].bleed?.map((stack) => stack.turnsLeft)).toEqual([1])
    expect(impacts(state).find((event) => event.effect === 'bleed')?.amount).toBe(4)
    state = wait(state); expect(state.enemies[0].bleed).toEqual([])
    expect(impacts(state).find((event) => event.effect === 'bleed')?.amount).toBe(2)
    expect(impacts(wait(state))).toEqual([])
  })
  it('ticks once per enemy, cleans dead statuses, and signatures never add Bleed', () => {
    const state = { ...game('queen'), enemies: [foe(), foe('other', c(3, 4))] }
    state.enemies.forEach((enemy) => applyBleed(enemy, -1))
    const next = wait(state)
    expect(impacts(next).filter((event) => event.effect === 'bleed').map((event) => event.targetId)).toEqual(['other', 'target'])
    const killed = wait({ ...state, enemies: [{ ...state.enemies[0], hp: 1, concussion: 0, burn: { turnsLeft: 2, appliedTurn: -1 } }] })
    expect(killed.enemies[0]).toMatchObject({ hp: 0, burn: undefined, bleed: undefined, concussion: undefined })
    expect(killed.events.some((event) => event.actor === 'target' && event.kind !== 'defeat')).toBe(false)
    expect(resolveTurn(game('queen'), { kind: 'ability' })!.enemies[0].bleed).toBeUndefined()
  })
})

describe('public test King: bounded Smite and Royal Decree', () => {
  it('shares one budget per offensive action, caps at 10, ignores DoTs and supports cards/counters', () => {
    const passives = emptyPassives()
    for (let turn = 0; turn < 8; turn++) {
      const budget = smiteBudget(passives, turn)
      expect(budget).toBe(Math.min(10, (turn + 1) * 2))
      expect(smiteBudget(passives, turn)).toBe(0)
      expect(Array.from({ length: 7 }, (_, i) => splitBonus(budget, 7, i)).reduce((a, b) => a + b, 0)).toBe(budget)
    }
    const base = game('king'), played = hit(base)
    expect(impacts(played)[0].amount).toBe(7) // provisional basic 4 + Light 1 + newly earned Smite 2
    expect(played.passives.smite).toBe(2)
    const { state, card } = holding(base, 'cut')
    expect(resolveTurn(state, { kind: 'card', cardInstanceId: card.instanceId, target: { kind: 'enemy', enemyId: 'target' } })!.passives.smite).toBe(2)
    const countered = resolveTurn({ ...base, enemies: [{ ...foe(), intent: 'attack', attackTarget: c(3, 3) }] }, { kind: 'defend' })!
    expect(countered.passives.smite).toBe(2)
    const dot = { ...base, enemies: [{ ...foe(), burn: { turnsLeft: 2, appliedTurn: -1 } }] }
    expect(wait(dot).passives.smite).toBe(0)
  })
  it('Decree permits the response before damage and distributes the total Smite budget', () => {
    const base = { ...game('king'), visible: all, enemies: [foe(), foe('other', c(3, 4))] }
    const player = resolvePlayerAction(base, { kind: 'ability' })!
    expect(impacts(player)).toEqual([])
    const next = resolveTurn(base, { kind: 'ability' })!
    expect(impacts(next).map((event) => event.amount)).toEqual([13, 13])
    const lastEnemyResponse = Math.max(...next.events.filter((event) => event.actor !== 'pawn').map((event) => event.id))
    expect(impacts(next).every((event) => event.id > lastEnemyResponse)).toBe(true)
    expect(next.passives.smite).toBe(2)
    expect(next.signatures.cooldowns.king).toBe(8)
    expect(next.turn).toBe(1)
    const lethal = resolveTurn({ ...base, hp: 1, enemies: [{ ...foe(), intent: 'attack', attackTarget: c(3, 3) }] }, { kind: 'ability' })!
    expect(lethal.status).toBe('defeat')
    expect(impacts(lethal)).toEqual([])
    expect(lethal.passives).toEqual(emptyPassives())
  })
  it('capped Smite adds ten total damage to eight Decree victims, not ten per victim', () => {
    const base = game('king'), neighbors = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].filter((dx) => dx || dy)
      .map((dx) => foe(`${dx}:${dy}`, c(3 + dx, 3 + dy))))
    const next = resolveTurn({ ...base, enemies: neighbors, passives: { ...base.passives, smite: 8 } }, { kind: 'ability' })!
    expect(impacts(next)).toHaveLength(8)
    expect(impacts(next).reduce((sum, event) => sum + event.amount!, 0)).toBe(8 * 12 + 10)
    expect(next.passives.smite).toBe(10)
    expect(next.turn).toBe(1)
  })
  it('pushes only on every third basic into free terrain; bosses resist, and Poise reduces only the first direct hit', () => {
    const base = game('king')
    const third = { ...base, passives: { ...base.passives, kingBasics: 2 } }
    const action = { kind: 'attack', targetId: 'target' } as const
    expect(resolvePlayerAction(third, action)!.enemies[0].cell).toEqual(c(5, 3))
    expect(resolvePlayerAction({ ...third, occupied: [c(5, 3)] }, action)!.enemies[0].cell).toEqual(c(4, 3))
    expect(resolvePlayerAction({ ...third, enemies: [{ ...foe(), boss: true }] }, action)!.enemies[0].cell).toEqual(c(4, 3))
    const charged = { ...base, enemies: [foe(), foe('other', c(3, 4))].map((enemy) => ({ ...enemy, intent: 'attack' as const, attackTarget: c(3, 3) })) }
    expect(wait(charged).hp).toBe(charged.hp - 3)
    expect(recordTransformationBossWin(emptyTransformations(), 'king', 'light').inventory).toEqual([])
    expect(bossForms).not.toContain('king')
  })
  it('Dark Decree retains inner/outer damage and safe knockback, with one shared bonus', () => {
    const base = game('king', 'dark')
    const state = { ...base, signatures: { ...base.signatures, reveal: { cells: Array.from({ length: 16 }, (_, i) => (2 + Math.floor(i / 4)) * 8 + 2 + i % 4), turnsLeft: 2, foresight: false } }, visible: all, enemies: [foe('a', c(4, 3)), foe('b', c(3, 5))]
      .map((enemy) => ({ ...enemy, intent: 'attack' as const, attackTarget: c(0, 0) })) }
    const next = resolveTurn(state, { kind: 'ability' })!
    expect(impacts(next).map((event) => event.amount)).toEqual([10, 5])
    expect(next.enemies.map((enemy) => enemy.cell)).toEqual([c(5, 3), c(3, 6)])
    expect(next.turn).toBe(1)
    expect(next.passives.smite).toBe(2)
  })
  it('multiple direct counters spend the action budget once rather than once per target', () => {
    const state = { ...game('king'), enemies: [foe('a', c(4, 3)), foe('b', c(3, 4))]
      .map((enemy) => ({ ...enemy, intent: 'attack' as const, attackTarget: c(3, 3) })) }
    const next = resolveTurn(state, { kind: 'defend' })!
    expect(next.events.filter((event) => event.kind === 'counter').map((event) => event.amount)).toEqual([4, 2])
    expect(next.passives.smite).toBe(2)
  })
})

describe('public tools and passive lifecycle boundaries', () => {
  beforeEach(() => { usePawnStore.getState().loadDungeon('passive-store'); usePawnStore.setState({ ...game(), runActive: true, phase: 'ready', floorNumber: 1 }) })
  it('preserves Sharpener through form changes/regeneration, resets it on real floors/death/restart', () => {
    usePawnStore.setState({ passives: { ...emptyPassives(), sharpener: 4 } })
    const store = usePawnStore.getState()
    expect(store.regenerateFloor()).toBe(true)
    expect(usePawnStore.getState().passives.sharpener).toBe(4)
    expect(store.debugGrant('bishop', 'light')).toBe(true)
    expect(store.submitAction({ kind: 'transform', form: 'bishop', attunement: 'light' })).toBe(true)
    let current = usePawnStore.getState(); current.advancePlayback(current.actionId, 'player'); current = usePawnStore.getState(); current.advancePlayback(current.actionId, 'enemies')
    expect(usePawnStore.getState().passives.sharpener).toBe(4)
    expect(store.playtest({ kind: 'revert' })).toBe(true)
    expect(usePawnStore.getState().passives.sharpener).toBe(4)
    expect(store.transitionFloor(undefined, true)).toBe(true)
    expect(usePawnStore.getState().passives.sharpener).toBe(0)
    usePawnStore.setState({ passives: { ...emptyPassives(), sharpener: 3 } })
    store.debugDefeat()
    expect(usePawnStore.getState().passives).toEqual(emptyPassives())
  })
  it('grants King on public test tools, carries Smite across its first floor, resets on ending, and guards hidden status inspection', () => {
    const store = usePawnStore.getState()
    expect(store.debugGrant('king', 'dark')).toBe(true)
    expect(store.submitAction({ kind: 'transform', form: 'king', attunement: 'dark' })).toBe(true)
    let current = usePawnStore.getState(); current.advancePlayback(current.actionId, 'player'); current = usePawnStore.getState(); current.advancePlayback(current.actionId, 'enemies')
    usePawnStore.setState({ passives: { ...emptyPassives(), smite: 8, kingBasics: 2 } })
    expect(store.transitionFloor(undefined, true)).toBe(true)
    expect(usePawnStore.getState().passives).toMatchObject({ smite: 8, kingBasics: 2 })
    expect(store.transitionFloor(undefined, true)).toBe(true)
    expect(usePawnStore.getState().passives.smite).toBe(0)
    const state = game(), action = { kind: 'status', effect: 'bleed', targetId: 'target' } as const
    expect(applyPlaytest(state, action)!.enemies[0].bleed).toHaveLength(1)
    expect(applyPlaytest({ ...state, visible: new Set([cellId(state.cell)]) }, action)).toBeNull()
    expect(completeTransformationFloor(game('king').transformations).active?.floorsLeft).toBe(1)
  })
  it('statuses and damage calculations remain deterministic without mutating input', () => {
    const state = game('bishop'), before = structuredClone(state)
    expect(hit(state)).toEqual(hit(state))
    expect(state).toEqual(before)
    const enemy = foe(); applyConcussion(enemy); applyConcussion(enemy)
    expect(enemy.concussion).toBe(1)
  })
  it('menus, invalid inputs and duplicate playback callbacks cannot tick statuses twice', () => {
    const state = game('queen')
    applyBurn(state.enemies[0], -1); applyBleed(state.enemies[0], -1)
    usePawnStore.setState(state)
    const store = usePawnStore.getState()
    expect(store.submitAction({ kind: 'attack', targetId: 'missing' })).toBe(false)
    expect(usePawnStore.getState().enemies[0].burn?.turnsLeft).toBe(2)
    expect(store.submitAction({ kind: 'wait' })).toBe(true)
    const oldId = usePawnStore.getState().actionId
    store.suspendRun(); store.advancePlayback(oldId, 'player')
    expect(usePawnStore.getState().turn).toBe(0)
    store.resumeRun()
    const newId = usePawnStore.getState().actionId
    store.advancePlayback(newId, 'player')
    const next = structuredClone({ turn: usePawnStore.getState().turn, enemies: usePawnStore.getState().enemies })
    expect(next.turn).toBe(1)
    expect(next.enemies[0].burn?.turnsLeft).toBe(1)
    expect(next.enemies[0].bleed?.[0].turnsLeft).toBe(2)
    store.advancePlayback(newId, 'player'); store.advancePlayback(oldId, 'enemies'); store.advancePlayback(newId, 'enemies')
    expect({ turn: usePawnStore.getState().turn, enemies: usePawnStore.getState().enemies }).toEqual(next)
  })
  it('ordinary lethal damage and a fresh run clear all temporary passive/status state', () => {
    const state = { ...game(), hp: 1, passives: { ...emptyPassives(), sharpener: 4 },
      enemies: [{ ...foe(), intent: 'attack' as const, attackTarget: c(3, 3), bleed: [{ turnsLeft: 3, appliedTurn: 0 }] }] }
    const next = wait(state)
    expect(next.status).toBe('defeat')
    expect(next.passives).toEqual(emptyPassives())
    usePawnStore.setState(next)
    usePawnStore.getState().restartRun()
    const fresh = usePawnStore.getState()
    expect(fresh.passives).toEqual(emptyPassives())
    expect(fresh.events).toEqual([])
    expect(fresh.enemies.every((enemy) => !enemy.burn && !enemy.bleed && enemy.concussion === undefined)).toBe(true)
  })
})
