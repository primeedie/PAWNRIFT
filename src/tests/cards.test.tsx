import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardBalance, cards, type CardId } from '../data/cards'
import { createGame, resolveEnemyPhase, resolvePlayerAction, resolveTurn, type Enemy, type GameState } from '../game/logic/combat'
import { cardOptions, type CardTarget } from '../game/logic/cardRules'
import { combatIndicator, visibleEnemies } from '../game/logic/combatIndicators'
import { createStarterDeck, discardAndRefill, type DeckState } from '../game/logic/deck'
import { cellFromId, cellId, type Dungeon } from '../game/logic/dungeon'
import { usePawnStore } from '../game/state/pawnStore'
import { CardHand } from '../ui/CardHand'
import { CombatStatus } from '../ui/CombatHUD'

// Static UI checks read the real store's current fixture, rather than its SSR initial snapshot.
// Store commands remain real; only the React subscription boundary is replaced for server rendering.
vi.mock('../game/state/pawnStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/state/pawnStore')>()
  const hook = Object.assign((selector?: (state: ReturnType<typeof actual.usePawnStore.getState>) => unknown) => {
    const state = actual.usePawnStore.getState()
    return selector ? selector(state) : state
  }, actual.usePawnStore)
  return { ...actual, usePawnStore: hook }
})

function fixture(): GameState {
  const dungeon: Dungeon = { seed: 'cards-fixture', style: 'courtyard', spawn: { column: 3, row: 3 }, exit: { column: 7, row: 7 },
    reservations: [], tiles: Array.from({ length: 64 }, (_, id) => ({ ...cellFromId(id), blocksMovement: false, blocksSight: false, rotation: 0 })) }
  const enemy: Enemy = { id: 'rookling-1', kind: 'rookling', cell: { column: 4, row: 3 }, from: { column: 4, row: 3 },
    hp: 10, maxHp: 10, intent: 'attack', attackTarget: dungeon.spawn, searchLeft: 0 }
  return { ...createGame(dungeon), enemies: [enemy] }
}
function holding(state: GameState, id: CardId): GameState {
  const all = [...state.deck.hand, ...state.deck.draw, ...state.deck.discard]
  const card = all.find((entry) => entry.definitionId === id)!
  const rest = all.filter((entry) => entry.instanceId !== card.instanceId)
  return { ...state, deck: { ...state.deck, hand: [card, ...rest.slice(0, 3)], draw: rest.slice(3), discard: [] } }
}
function action(state: GameState, id: CardId, target: CardTarget = { kind: 'self' }) {
  return { kind: 'card' as const, cardInstanceId: state.deck.hand.find((card) => card.definitionId === id)!.instanceId, target }
}
function allCards(deck: DeckState) { return [...deck.hand, ...deck.draw, ...deck.discard].map((card) => card.instanceId).sort() }

describe('seeded starter deck and card circulation', () => {
  it('creates 12 unique instances, four in hand, with reproducible seed shuffling', () => {
    for (let i = 0; i < 100; i++) {
      const deck = createStarterDeck(`deck-${i}`)
      expect(deck).toEqual(createStarterDeck(`deck-${i}`))
      expect(deck.hand).toHaveLength(4)
      expect(deck.draw).toHaveLength(8)
      expect(deck.discard).toHaveLength(0)
      expect(new Set(allCards(deck)).size).toBe(12)
    }
    expect(createStarterDeck('a').draw).not.toEqual(createStarterDeck('b').draw)
  })
  it('discards played instances, replaces one card, and reshuffles only on an empty draw pile', () => {
    let deck = createStarterDeck('circulation')
    const original = allCards(deck)
    const played = deck.hand[0]
    const before = structuredClone(deck)
    const next = discardAndRefill(deck, played.instanceId)
    expect(deck).toEqual(before)
    expect(next.hand).toHaveLength(4)
    expect(next.hand).not.toContainEqual(played)
    expect(next.discard).toEqual([played])
    expect(next.draw).toHaveLength(7)
    for (let i = 0; i < 100; i++) {
      const copy = structuredClone(deck)
      const id = deck.hand[i % 4].instanceId
      const result = discardAndRefill(deck, id)
      expect(result).toEqual(discardAndRefill(copy, id))
      expect(allCards(result)).toEqual(original)
      expect(result.hand).toHaveLength(4)
      expect(result.shuffleCount - deck.shuffleCount).toBe(deck.draw.length ? 0 : 1)
      deck = result
    }
    expect(deck.shuffleCount).toBeGreaterThan(0)
    expect(discardAndRefill(deck, 'missing')).toBe(deck)
  })
})

describe('cards use the unified deterministic world turn', () => {
  it('pays upfront, recovers only at world completion, and never assumes recovery to afford a card', () => {
    const state = holding(fixture(), 'crimson')
    const play = action(state, 'crimson', { kind: 'enemy', enemyId: 'rookling-1' })
    const before = structuredClone(state)
    const player = resolvePlayerAction(state, play)!
    expect(player.energy).toBe(0)
    expect(player.turn).toBe(0)
    expect(player.enemies[0].hp).toBe(3)
    const after = resolveEnemyPhase(player)
    expect(after.energy).toBe(1)
    expect(after.turn).toBe(1)
    expect(after.events.filter((event) => event.kind === 'hit' && event.actor === 'rookling-1')).toHaveLength(1)
    expect(resolveTurn(state, play)).toEqual(after)
    expect(state).toEqual(before)
    expect(resolveTurn({ ...state, energy: 2 }, play)).toBeNull()
    expect(resolveTurn({ ...state, energy: 0 }, { kind: 'attack', targetId: 'rookling-1' })!.energy).toBe(1)
    expect(resolveTurn({ ...state, energy: 2 }, { kind: 'wait' })!.energy).toBe(3)
    expect(resolveTurn(state, { kind: 'defend' })!.energy).toBe(3)
  })
  it('cards killed by player cannot respond; missing, concealed, distant, diagonal and dead targets are invalid', () => {
    const state = holding(fixture(), 'cut')
    const play = action(state, 'cut', { kind: 'enemy', enemyId: 'rookling-1' })
    const killed = resolveTurn({ ...state, enemies: [{ ...state.enemies[0], hp: 4 }] }, play)!
    expect(killed.hp).toBe(state.hp)
    expect(killed.enemies[0].hp).toBe(0)
    expect(killed.events.some((event) => event.actor === 'rookling-1' && event.kind === 'hit')).toBe(false)
    for (const cell of [{ column: 6, row: 3 }, { column: 4, row: 4 }]) {
      expect(resolveTurn({ ...state, enemies: [{ ...state.enemies[0], cell }] }, play)).toBeNull()
    }
    expect(resolveTurn({ ...state, visible: new Set([cellId(state.cell)]), explored: new Set(Array.from({ length: 64 }, (_, i) => i)) }, play)).toBeNull()
    expect(resolveTurn({ ...state, enemies: [{ ...state.enemies[0], hp: 0 }] }, play)).toBeNull()
    expect(resolveTurn(state, { ...play, cardInstanceId: 'missing' })).toBeNull()
    expect(resolveTurn(state, { ...play, target: { kind: 'enemy', enemyId: 'missing' } })).toBeNull()
    expect(resolveTurn(state, { ...play, target: { kind: 'self' } })).toBeNull()
    const blocked = { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => samePosition(tile, state.enemies[0].cell) ? { ...tile, blocksMovement: true, blocksSight: true } : tile) } }
    expect(resolveTurn(blocked, play)).toBeNull()
    expect(resolveTurn({ ...state, occupied: [state.enemies[0].cell] }, play)).toBeNull()
    expect(state.energy).toBe(3)
    expect(state.turn).toBe(0)
  })
  it('Ward blocks a shared damage pool for this response and then expires', () => {
    const state = holding(fixture(), 'ward')
    const second: Enemy = { ...state.enemies[0], id: 'rookling-2', cell: { column: 3, row: 4 }, from: { column: 3, row: 4 } }
    const after = resolveTurn({ ...state, enemies: [...state.enemies, second] }, action(state, 'ward'))!
    expect(after.hp).toBe(state.hp - 1)
    expect(after.events.filter((event) => event.kind === 'hit').map((event) => event.amount)).toEqual([0, 1])
    expect(after.block).toBe(0)
    expect(after.preparedCounter).toBe(0)
  })
  it('Riposte counters the first actual strike only and never counters a missed telegraph', () => {
    const state = holding(fixture(), 'riposte')
    const after = resolveTurn(state, action(state, 'riposte'))!
    expect(after.hp).toBe(state.hp - 1)
    expect(after.enemies[0].hp).toBe(6)
    expect(after.events.filter((event) => event.kind === 'counter')).toHaveLength(1)
    expect(after.preparedCounter).toBe(0)
    const miss = resolveTurn({ ...state, enemies: [{ ...state.enemies[0], attackTarget: { column: 2, row: 3 } }] }, action(state, 'riposte'))!
    expect(miss.events.some((event) => event.kind === 'counter')).toBe(false)
    expect(miss.hp).toBe(state.hp)
    const two = { ...state, enemies: [...state.enemies, { ...state.enemies[0], id: 'second', cell: { column: 3, row: 4 } }] }
    expect(resolveTurn(two, action(two, 'riposte'))!.events.filter((event) => event.kind === 'counter')).toHaveLength(1)
  })
  it('Slip moves one clear tile, updates fog, and evades a committed strike', () => {
    const state = holding(fixture(), 'slip')
    const cell = { column: 2, row: 3 }
    const next = resolveTurn(state, action(state, 'slip', { kind: 'tile', cell }))!
    expect(next.cell).toEqual(cell)
    expect(next.facing).toBe('west')
    expect(next.hp).toBe(state.hp)
    expect(next.turn).toBe(1)
    expect(next.visible.has(cellId({ column: 1, row: 3 }))).toBe(true)
    for (const cell of [state.cell, state.enemies[0].cell, { column: -1, row: 3 }, { column: 1, row: 3 }, { column: 2, row: 2 }])
      expect(resolveTurn(state, action(state, 'slip', { kind: 'tile', cell }))).toBeNull()
    const occupied = { ...state, occupied: [cell] }
    expect(resolveTurn(occupied, action(state, 'slip', { kind: 'tile', cell }))).toBeNull()
    const wall = { ...state, dungeon: { ...state.dungeon, tiles: state.dungeon.tiles.map((tile) => samePosition(tile, cell) ? { ...tile, blocksMovement: true } : tile) } }
    expect(resolveTurn(wall, action(state, 'slip', { kind: 'tile', cell }))).toBeNull()
  })
  it('Focus persists until the next basic/card strike, caps, and cannot be gained at cap', () => {
    const state = holding(fixture(), 'focus')
    const focused = resolveTurn(state, action(state, 'focus'))!
    expect(focused.focus).toBe(1)
    expect(focused.energy).toBe(3)
    const waited = resolveTurn(focused, { kind: 'wait' })!
    expect(waited.focus).toBe(1)
    const struck = resolveTurn(waited, { kind: 'attack', targetId: 'rookling-1' })!
    expect(struck.enemies[0].hp).toBe(6)
    expect(struck.focus).toBe(0)
    const cut = holding({ ...fixture(), focus: 2 }, 'cut')
    expect(resolveTurn(cut, action(cut, 'cut', { kind: 'enemy', enemyId: 'rookling-1' }))!.enemies[0].hp).toBe(4)
    expect(resolveTurn({ ...state, focus: cardBalance.maxFocus }, action(state, 'focus'))).toBeNull()
  })
  it('Mend heals immediately, clamps to maximum, emits actual healing, then enemies respond', () => {
    const state = holding({ ...fixture(), hp: 10 }, 'mend')
    const player = resolvePlayerAction(state, action(state, 'mend'))!
    expect(player.hp).toBe(12)
    expect(player.energy).toBe(1)
    expect(player.events.find((event) => event.kind === 'heal')?.amount).toBe(2)
    const after = resolveEnemyPhase(player)
    expect(after.hp).toBe(10)
    expect(after.energy).toBe(2)
    expect(resolveTurn({ ...state, hp: state.maxHp }, action(state, 'mend'))).toBeNull()
  })
  it('lethal incoming damage stops counters and subsequent enemies; defeated runs reject cards', () => {
    const state = holding({ ...fixture(), hp: 1 }, 'riposte')
    const dead = resolveTurn(state, action(state, 'riposte'))!
    expect(dead.hp).toBe(0)
    expect(dead.status).toBe('defeat')
    expect(dead.events.some((event) => event.kind === 'counter')).toBe(false)
    expect(resolveTurn(dead, action(state, 'riposte'))).toBeNull()
    expect(resolveEnemyPhase(dead)).toBe(dead)
  })
})

function samePosition(a: { column: number; row: number }, b: { column: number; row: number }) { return a.column === b.column && a.row === b.row }

describe('feedback and HP information boundaries', () => {
  it('labels damage, healing and fully prevented damage without displaying unseen events', () => {
    const state = holding(fixture(), 'ward')
    const blocked = resolveTurn(state, action(state, 'ward'))!
    const event = blocked.events.find((event) => event.kind === 'hit')!
    expect(combatIndicator(event)).toEqual({ text: 'BLOCKED', tone: 'blocked' })
    expect(combatIndicator({ ...event, amount: 2 })).toEqual({ text: '−2', tone: 'damage' })
    expect(combatIndicator({ ...event, kind: 'heal', amount: 4 })).toEqual({ text: '+4', tone: 'heal' })
    expect(combatIndicator({ ...event, seen: false })).toBeNull()
    expect(combatIndicator({ ...event, kind: 'move' })).toBeNull()
  })
  it('event IDs persist through the response and increase on consecutive actions', () => {
    const state = holding(fixture(), 'mend')
    const player = resolvePlayerAction({ ...state, hp: 6 }, action(state, 'mend'))!
    const world = resolveEnemyPhase(player)
    expect(world.events.slice(0, player.events.length)).toEqual(player.events)
    expect(new Set(world.events.map((event) => event.id)).size).toBe(world.events.length)
    const next = resolveTurn(world, { kind: 'wait' })!
    expect(next.events.every((event) => event.id > world.eventSerial)).toBe(true)
  })
  it('only living enemies in current sight have models/HP labels, including with debug reveal', () => {
    const state = fixture()
    expect(visibleEnemies(state)).toHaveLength(1)
    expect(visibleEnemies({ ...state, enemies: [{ ...state.enemies[0], hp: 0 }] })).toEqual([])
    const unseen = { ...state, visible: new Set<number>(), explored: new Set([cellId(state.enemies[0].cell)]), revealAll: true }
    expect(visibleEnemies(unseen)).toEqual([])
    expect(visibleEnemies({ ...state, enemies: [{ ...state.enemies[0], hp: 8 }] })[0].hp).toBe(8)
  })
  it('renders numerical player HP with an updating muted health bar', () => {
    usePawnStore.setState({ ...fixture(), hp: 5 })
    const damaged = renderToStaticMarkup(<CombatStatus />)
    expect(damaged).toContain('HP 5/12')
    expect(damaged).toContain('aria-valuenow="5"')
    usePawnStore.setState({ hp: 9 })
    expect(renderToStaticMarkup(<CombatStatus />)).toContain('aria-valuenow="9"')
  })
})

describe('card inspection, playback locking and reset', () => {
  beforeEach(() => usePawnStore.setState({ ...holding(fixture(), 'ward'), from: fixture().cell, phase: 'ready', isMoving: false,
    runActive: true, actionId: 0, selectedCardId: undefined }))
  it('inspection, targeting, and cancel never advance time or change deck/energy/enemies', () => {
    const before = usePawnStore.getState()
    before.selectCard(before.deck.hand[0].instanceId)
    const selected = usePawnStore.getState()
    cardOptions(selected, selected.selectedCardId!)
    const markup = renderToStaticMarkup(<CardHand />)
    expect(markup.match(/class="hand-card"/g)).toHaveLength(4)
    expect(markup).toContain('ENERGY')
    expect(markup).toContain('Cancel')
    selected.selectCard(undefined)
    const after = usePawnStore.getState()
    expect(after.turn).toBe(before.turn)
    expect(after.energy).toBe(before.energy)
    expect(after.enemies).toBe(before.enemies)
    expect(after.deck).toBe(before.deck)
  })
  it('an invalid play preserves selection and all resources', () => {
    const state = usePawnStore.getState()
    state.selectCard(state.deck.hand[0].instanceId)
    const selected = usePawnStore.getState()
    expect(selected.playSelectedCard({ kind: 'enemy', enemyId: 'rookling-1' })).toBe(false)
    expect(usePawnStore.getState()).toBe(selected)
  })
  it('locks further input and duplicate callbacks, gives exactly one response per card', () => {
    const state = usePawnStore.getState()
    state.selectCard(state.deck.hand[0].instanceId)
    expect(state.playSelectedCard({ kind: 'self' })).toBe(true)
    const played = usePawnStore.getState()
    expect(played.selectedCardId).toBeUndefined()
    expect(played.energy).toBe(2)
    expect(played.deck.hand).toHaveLength(4)
    expect(played.deck.discard).toHaveLength(1)
    expect(played.submitAction({ kind: 'wait' })).toBe(false)
    played.selectCard(played.deck.hand[0].instanceId)
    expect(usePawnStore.getState().selectedCardId).toBeUndefined()
    played.advancePlayback(played.actionId, 'player')
    const resolved = usePawnStore.getState()
    expect(resolved.turn).toBe(1)
    expect(resolved.energy).toBe(3)
    played.advancePlayback(played.actionId, 'player')
    expect(usePawnStore.getState()).toBe(resolved)
    played.advancePlayback(played.actionId, 'enemies')
    expect(usePawnStore.getState().turn).toBe(1)
  })
  it('menu suspension keeps accepted card cost and resumes just one response', () => {
    const state = usePawnStore.getState()
    state.submitAction(action(state, 'ward'))
    const oldId = usePawnStore.getState().actionId
    state.suspendRun()
    state.advancePlayback(oldId, 'player')
    expect(usePawnStore.getState().energy).toBe(2)
    expect(usePawnStore.getState().turn).toBe(0)
    state.resumeRun()
    const resumed = usePawnStore.getState()
    resumed.advancePlayback(resumed.actionId, 'player')
    resumed.advancePlayback(resumed.actionId, 'player')
    expect(usePawnStore.getState().energy).toBe(3)
    expect(usePawnStore.getState().turn).toBe(1)
  })
  it('restart resets hand, piles, energy, focus, block, selection and event serial', () => {
    const state = usePawnStore.getState()
    usePawnStore.setState({ hp: 0, status: 'defeat', energy: 0, focus: 3, block: 8, preparedCounter: 5,
      selectedCardId: state.deck.hand[0].instanceId, eventSerial: 500, deck: discardAndRefill(state.deck, state.deck.hand[0].instanceId) })
    state.restartRun()
    const fresh = usePawnStore.getState()
    expect(fresh).toMatchObject({ hp: 12, turn: 0, status: 'playing', energy: 3, focus: 0, block: 0, preparedCounter: 0, eventSerial: 0 })
    expect(fresh.selectedCardId).toBeUndefined()
    expect(fresh.deck).toEqual(createStarterDeck(fresh.dungeon.seed))
    expect(fresh.deck.hand).toHaveLength(cardBalance.handSize)
    expect(fresh.deck.discard).toEqual([])
  })
  it('keeps every card typed with explicit costs, descriptions and effects', () => {
    expect(Object.keys(cards)).toHaveLength(7)
    for (const card of Object.values(cards)) {
      expect(card.description.length).toBeGreaterThan(0)
      expect(card.cost).toBeGreaterThanOrEqual(0)
      expect(card.cost).toBeLessThanOrEqual(cardBalance.maxEnergy)
    }
  })
})
