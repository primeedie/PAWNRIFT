import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coreStarterCards } from '../data/cards'
import { campaignGame } from '../game/logic/run'
import { selectStartingCards } from '../game/logic/deck'
import { emptyTransformations } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'

describe('normal runs versus explicit seed overrides', () => {
  beforeEach(() => {
    usePawnStore.setState({ transformations: emptyTransformations(), deathRetentionDone: false })
    usePawnStore.getState().loadDungeon('old-hardcoded-start')
  })
  it('first Play creates a fresh run instead of resuming the initialization board', () => {
    usePawnStore.setState({ hasStartedRun: false })
    useAppStore.getState().showTitle()
    useAppStore.getState().play()
    const state = usePawnStore.getState()
    expect(state.hasStartedRun).toBe(true)
    expect(state.dungeon.seed).not.toBe('old-hardcoded-start')
    expect(state.dungeon).toEqual(campaignGame(state.masterSeed,state.floorNumber,state.progress!).dungeon)
    expect(state.turn).toBe(0)
  })
  it('Resume preserves a living run and its pending phase; New Run explicitly replaces it', () => {
    const state = usePawnStore.getState()
    state.submitAction({ kind: 'wait' })
    const seed = state.dungeon.seed
    useAppStore.getState().showTitle()
    useAppStore.getState().play()
    const resumed = usePawnStore.getState()
    expect(resumed.dungeon.seed).toBe(seed)
    expect(resumed.phase).toBe('player')
    resumed.advancePlayback(resumed.actionId, 'player')
    expect(usePawnStore.getState().turn).toBe(1)
    useAppStore.getState().newRun()
    const fresh = usePawnStore.getState()
    expect(fresh.dungeon.seed).not.toBe(seed)
    expect(fresh).toMatchObject({ turn: 0, floorNumber: 1, phase: 'ready', isMoving: false })
  })
  it('100 normal restarts vary layouts and seeded Stage 8 deck composition while preserving the core eight', () => {
    const seeds = new Set<string>(), layouts = new Set<string>()
    for (let i = 0; i < 100; i++) {
      usePawnStore.getState().restartRun()
      const state = usePawnStore.getState()
      seeds.add(state.dungeon.seed)
      layouts.add(JSON.stringify(state.dungeon.tiles.map((tile) => [tile.blocksMovement, tile.prop])))
      expect(state.dungeon).toEqual(campaignGame(state.masterSeed,state.floorNumber,state.progress!).dungeon)
      expect(state.deck.originalStarter).toEqual(selectStartingCards(state.masterSeed))
      expect(state.deck.originalStarter?.slice(0,8)).toEqual(coreStarterCards)
      expect([...state.deck.hand,...state.deck.draw]).toHaveLength(12)
    }
    expect(seeds.size).toBe(100)
    expect(layouts.size).toBeGreaterThan(70)
  })
  it('explicit seeds/styles reproduce floor and deck even after intervening runs; generation never uses Math.random', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Unseeded randomness in generation') })
    try {
      const load = usePawnStore.getState().loadDungeon
      load('shared-public-seed', 'maze')
      const first = structuredClone({ dungeon: usePawnStore.getState().dungeon, deck: usePawnStore.getState().deck })
      usePawnStore.getState().restartRun()
      load('shared-public-seed', 'maze')
      expect({ dungeon: usePawnStore.getState().dungeon, deck: usePawnStore.getState().deck }).toEqual(first)
    } finally { spy.mockRestore() }
  })
  it('Play after a completed run starts a new seed rather than reopening the cleared layout', () => {
    const old = usePawnStore.getState().dungeon.seed
    usePawnStore.setState({ status: 'victory' })
    useAppStore.getState().showTitle()
    useAppStore.getState().play()
    expect(usePawnStore.getState().status).toBe('playing')
    expect(usePawnStore.getState().dungeon.seed).not.toBe(old)
  })
})
