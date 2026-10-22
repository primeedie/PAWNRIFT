import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'
import { emptyTransformations } from '../game/logic/transformations'
import { bossForms } from '../data/forms'
import { createTraining, defaultDummy, dummyEnemy, trainingArena, trainingControl, trainingScenarios } from '../game/logic/training'
import { recordAnalysis, emptyAnalysis, damagePerTurn } from '../game/logic/combatAnalysis'
import { resolveTurn, resolvePlayerAction, type GameState } from '../game/logic/combat'
import { cellId } from '../game/logic/dungeon'
import { applyBleed, applyBurn } from '../game/logic/passives'
import { abilityReason } from '../game/logic/signatures'
import { formMovement } from '../game/logic/chessMovement'

const cell = (column: number, row: number) => ({ column, row })
function equip(form: 'pawn' | typeof bossForms[number] = 'pawn') {
  const fresh = createTraining(1)
  return trainingControl(fresh.game, fresh.session, { kind: 'form', form, attunement: 'light' })!
}
function attack(game: GameState, id = 'dummy-1') { return resolveTurn(game, { kind: 'attack', targetId: id })! }
function data() {
  return structuredClone(Object.fromEntries(Object.entries(usePawnStore.getState()).filter(([key, value]) => key !== 'actionId' && typeof value !== 'function')))
}
function finish() {
  let state = usePawnStore.getState(); state.advancePlayback(state.actionId, 'player')
  state = usePawnStore.getState(); state.advancePlayback(state.actionId, 'enemies')
}

describe('complete training isolation', () => {
  beforeEach(() => {
    const store = usePawnStore.getState(); if (store.training) store.leaveTraining()
    usePawnStore.setState({ transformations: emptyTransformations(), status: 'playing', phase: 'ready', deathRetentionDone: true })
    store.loadDungeon('training-isolation', 'courtyard')
    usePawnStore.setState({ runActive: true, phase: 'ready', status: 'playing', deathRetentionDone: true })
  })
  afterEach(() => { if (usePawnStore.getState().training) usePawnStore.getState().leaveTraining() })
  it('restores every data field, deck/RNG/fog/item lifecycle and targeting without regeneration', () => {
    const store = usePawnStore.getState()
    store.debugGrant('knight', 'light'); store.debugGrant('bishop', 'dark')
    store.submitAction({ kind: 'transform', form: 'knight', attunement: 'light' }); finish()
    usePawnStore.setState({ hp: 7, energy: 1, focus: 2, turn: 14, selectedCardId: usePawnStore.getState().deck.hand[0].instanceId,
      signatures: { ...usePawnStore.getState().signatures, eyeUsed: true, cooldowns: { ...usePawnStore.getState().signatures.cooldowns, pawn: 4, queen: 7 } },
      selectedAbility: true, abilityDestination: cell(3, 4), passives: { sharpener: 4, smite: 0, kingBasics: 0 } })
    const before = data(), id = usePawnStore.getState().actionId
    expect(store.enterTraining()).toBe(true)
    expect(store.enterTraining()).toBe(false)
    expect(store.train({ kind: 'form', form: 'king', attunement: 'dark' })).toBe(true)
    expect(store.submitAction({ kind: 'attack', targetId: 'dummy-1' })).toBe(true); finish()
    expect(store.train({ kind: 'restore', resource: 'focus' })).toBe(true)
    expect(store.train({ kind: 'scenario', scenario: 'eye' })).toBe(true)
    store.submitAction({ kind: 'ability' }); finish()
    store.submitAction({ kind: 'wait' }); finish()
    expect(store.transitionFloor(undefined, true)).toBe(false)
    expect(store.regenerateFloor('should-not-touch-run')).toBe(false)
    expect(store.leaveTraining()).toBe(true)
    expect(data()).toStrictEqual(before)
    expect(usePawnStore.getState().actionId).toBeGreaterThan(id)
  })
  it('leaving mid-training action cancels its callbacks; real-run pending actions cannot enter', () => {
    const store = usePawnStore.getState(), before = data()
    expect(store.enterTraining()).toBe(true)
    expect(store.submitAction({ kind: 'attack', targetId: 'dummy-1' })).toBe(true)
    const stale = usePawnStore.getState().actionId
    store.leaveTraining(); store.advancePlayback(stale, 'player'); store.advancePlayback(stale, 'enemies')
    expect(data()).toStrictEqual(before)
    store.submitAction({ kind: 'wait' })
    expect(store.enterTraining()).toBe(false)
    finish()
  })
  it('menu navigation restores the run first; training defeat/reset never invokes retention', () => {
    const store = usePawnStore.getState(), before = data()
    store.enterTraining(); usePawnStore.setState({ hp: 0, status: 'defeat', phase: 'ready' })
    store.restartRun()
    expect(usePawnStore.getState()).toMatchObject({ mode: 'training', hp: 12, turn: 0, status: 'playing' })
    useAppStore.getState().showTitle()
    expect(usePawnStore.getState().training).toBeNull()
    expect({ ...data(), runActive: true }).toStrictEqual(before)
  })
})

describe('real 8x8 arena and dummy rules', () => {
  it('uses 64 real tiles, full training sight, and ordinary one-turn full lanes', () => {
    for (const scenario of trainingScenarios) expect(trainingArena(scenario).tiles).toHaveLength(64)
    for (const form of bossForms) {
      const { game } = equip(form)
      expect(game.visible.size).toBe(64)
      expect(game.enemies[0]).toMatchObject({ kind: 'dummy', hp: 1000, trainingDummy: { behavior: 'passive' } })
      const from = cell(0, 0), to = form === 'bishop' || form === 'queen' ? cell(7, 7) : cell(0, 7)
      if (form !== 'knight') expect(formMovement(form)(from, to, { size: 8, available: game.dungeon.tiles, blocked: [], occupied: [], visible: game.visible })).toBe(true)
      const next = resolveTurn(game, { kind: 'wait' })!
      expect(next.turn).toBe(1)
      expect(next.events.filter((event) => event.actor === 'dummy-1')).toMatchObject([{ kind: 'wait' }])
      expect(next.status).toBe('playing')
    }
  })
  it('rejects bad HP, out-of-bounds, duplicate, overlapping and blocked placements; reset stays valid', () => {
    const { game, session } = createTraining(1, 'blocked')
    for (const specs of [[defaultDummy(0, game.cell)], [defaultDummy(0, cell(-1, 0))], [defaultDummy(0, cell(4, 3))],
      [defaultDummy(), defaultDummy()], [{ ...defaultDummy(), hp: -1 }]])
      expect(trainingControl(game, session, { kind: 'dummies', specs })).toBeNull()
    const fresh = createTraining(1, 'open', [defaultDummy(0, cell(3, 3))])
    expect(fresh.game.cell).not.toEqual(fresh.game.enemies[0].cell)
    const dead = { ...fresh.game, cell: fresh.game.enemies[0].cell, enemies: [{ ...fresh.game.enemies[0], hp: 0 }] }
    expect(trainingControl(dead, fresh.session, { kind: 'dummy-resource', id: 'dummy-1', resource: 'hp' })).toBeNull()
  })
  it('passive response opportunities progress normal/elite/boss concussion and immunity', () => {
    for (const [rank, count, immunity] of [['normal', 1, 2], ['elite', 2, 3], ['boss', 3, 5]] as const) {
      const fresh = equip('rook')
      let game = { ...fresh.game, enemies: [dummyEnemy({ ...defaultDummy(), rank })] }
      for (let i = 0; i < count; i++) {
        game = attack(game)
        expect(game.events.filter((event) => event.actor === 'dummy-1')).toMatchObject([{ kind: 'wait' }])
      }
      game = attack(game)
      expect(game.enemies[0].stunImmunity).toBe(immunity)
      expect(game.events.filter((event) => event.actor === 'dummy-1')).toMatchObject([{ kind: 'stun' }])
    }
  })
  it('sparring uses real telegraphs, defense, parry, retaliation and one response per dummy', () => {
    for (const form of ['pawn', 'rook'] as const) {
      const base = equip(form), enemy = dummyEnemy({ ...defaultDummy(), behavior: 'sparring' })
      const first = resolveTurn({ ...base.game, enemies: [enemy] }, { kind: 'wait' })!
      expect(first.enemies[0].intent).toBe('attack')
      const defended = resolveTurn(first, { kind: 'ability' })!
      expect(defended.hp).toBe(first.hp)
      expect(defended.events.some((event) => event.kind === 'counter')).toBe(true)
      expect(defended.turn).toBe(2)
      expect(defended.events.filter((event) => event.actor === enemy.id)).toHaveLength(form === 'pawn' ? 0 : 1)
    }
  })
  it('uses real seeded Eye and isolated once-per-floor limits, with no fake map reveal', () => {
    const base = createTraining(7, 'eye'), equipped = trainingControl(base.game, base.session, { kind: 'form', form: 'bishop', attunement: 'dark' })!
    expect(equipped.game.visible.size).toBe(9)
    const first = resolveTurn(equipped.game, { kind: 'ability' })!
    expect(first.signatures.reveal?.cells).toHaveLength(16)
    expect(first).toEqual(resolveTurn(equipped.game, { kind: 'ability' }))
    expect(abilityReason(first)).toBe('Used this floor.')
    const moved = trainingControl(first, base.session, { kind: 'restore', resource: 'cooldowns' })!
    expect(moved.game.signatures.eyeUsed).toBe(false)
    expect(first.signatures.eyeUsed).toBe(true)
  })
  it('dummy defense and Block use the actual Knight penetration calculation and collision', () => {
    const base = equip('knight'), spec = { ...defaultDummy(0, cell(5, 3)), defense: 10, block: 2 }
    const game = { ...base.game, focus: 20, enemies: [dummyEnemy(spec)] }
    const next = attack(game)
    expect(next.events.find((event) => event.breakdown)?.breakdown).toMatchObject({ base: 3, attunement: 1, focus: 20, defense: 9, penetration: 1, blocked: 2, hpDamage: 13 })
    expect(resolveTurn({ ...game, occupied: [cell(4, 3)] }, { kind: 'attack', targetId: spec.id })).toBeNull()
    expect(resolveTurn(game, { kind: 'move', destination: spec.cell })).toBeNull()
  })
})

describe('event-derived combat analysis', () => {
  it('counts main/follow-up once, totals actual HP, and uses completed-turn DPT', () => {
    const base = createTraining(1), first = attack(base.game), second = attack(first)
    let analysis = recordAnalysis(emptyAnalysis(), first.events, 10)
    analysis = recordAnalysis(analysis, second.events, 11)
    expect(analysis).toMatchObject({ total: 7, basic: 7, passive: 1, actions: 2, turns: 2, attacks: 2 })
    expect(damagePerTurn(analysis)).toBe(3.5)
    expect(recordAnalysis(analysis, second.events, 11)).toBe(analysis)
    expect(analysis.history.filter((event) => event.breakdown).map((event) => event.breakdown!.source)).toEqual(['pawn basic', 'pawn basic', 'Sharpener'])
  })
  it('separates Block and overkill from HP damage and passive contribution', () => {
    const base = createTraining(1), state = { ...base.game, passives: { sharpener: 4, smite: 0, kingBasics: 0 }, enemies: [{ ...base.game.enemies[0], hp: 2, block: 1 }] }
    const next = attack(state), analysis = recordAnalysis(emptyAnalysis(), next.events, 1)
    expect(analysis).toMatchObject({ total: 2, blocked: 1, overkill: 0, passive: 0 })
    const overkill = attack({ ...base.game, enemies: [{ ...base.game.enemies[0], hp: 1 }] })
    expect(recordAnalysis(emptyAnalysis(), overkill.events, 1)).toMatchObject({ total: 1, overkill: 2 })
  })
  it('records Swish/Burn, individual Bleed lifetimes and mitigation without double ticks', () => {
    const bishop = equip('bishop'), state = { ...bishop.game, enemies: [defaultDummy(0), defaultDummy(1, cell(4, 4)), defaultDummy(2, cell(3, 4))].map(dummyEnemy) }
    const first = attack(state), next = resolveTurn(first, { kind: 'wait' })!
    expect(first.events.filter((event) => event.breakdown).map((event) => event.breakdown!.source)).toEqual(['bishop basic', 'Swish splash', 'Swish splash'])
    expect(next.events.filter((event) => event.effect === 'burn')).toHaveLength(1)
    const queen = equip('queen'), target = queen.game.enemies[0]
    applyBleed(target, -1); applyBleed(target, -1); applyBleed(target, -1)
    target.block = 1; target.defense = 1
    const tick = resolveTurn(queen.game, { kind: 'wait' })!, hit = tick.events.find((event) => event.effect === 'bleed')!
    expect(hit.breakdown?.stackDamage?.map((stack) => stack.hpDamage)).toEqual([0, 2, 2])
    expect(recordAnalysis(emptyAnalysis(), tick.events, 1)).toMatchObject({ total: 4, dot: 4, actions: 1, attacks: 0 })
    expect(target.bleed?.map((stack) => stack.turnsLeft)).toEqual([3, 3, 3])
  })
  it('keeps statistics when clearing logs and never records unseen damage/HP', () => {
    const base = createTraining(1), enemy = base.game.enemies[0]
    enemy.cell = cell(7, 7); applyBurn(enemy, -1)
    const game = { ...base.game, trainingVision: 'fog' as const, visible: new Set([cellId(base.game.cell)]), explored: new Set([cellId(base.game.cell)]) }
    const tick = resolveTurn(game, { kind: 'wait' })!, analysis = recordAnalysis(emptyAnalysis(), tick.events, 1)
    expect(analysis.total).toBe(0)
    expect(analysis.history.every((event) => event.seen)).toBe(true)
    const cleared = trainingControl(base.game, { ...base.session, analysis: { ...analysis, total: 100 } }, { kind: 'log' })!
    expect(cleared.session.analysis.total).toBe(100)
    expect(cleared.session.analysis.history).toEqual([])
  })
  it('supports one to three dummies and all ordinary forms/attunements through the real resolver', () => {
    for (const form of bossForms) for (const attunement of ['light', 'dark'] as const) {
      const base = createTraining(1, 'cluster'), setup = trainingControl(base.game, base.session, { kind: 'form', form, attunement })!
      const result = resolvePlayerAction(setup.game, { kind: 'attack', targetId: 'dummy-1' })!
      expect(result.transformations.inventory[0].charges).toBe(5)
      expect(result.events.some((event) => event.breakdown)).toBe(true)
    }
    const base = createTraining(1)
    expect(trainingControl(base.game, base.session, { kind: 'form', form: 'king', attunement: 'light' })!.game.transformations.active?.form).toBe('king')
  })
})
