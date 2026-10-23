import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '../game/logic/combat'
import { generateDungeon } from '../game/logic/dungeon'
import { activateTransformation, emptyTransformations, grantTransformation } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { TransformationHUD } from '../ui/TransformationHUD'
import { GameOver } from '../ui/GameOver'
import DungeonTools from '../ui/DungeonTools'
import TransformationTools from '../ui/TransformationTools'

vi.mock('../game/state/pawnStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/state/pawnStore')>()
  return { ...actual, usePawnStore: Object.assign((selector?: (state: ReturnType<typeof actual.usePawnStore.getState>) => unknown) => {
    const state = actual.usePawnStore.getState()
    return selector ? selector(state) : state
  }, actual.usePawnStore) }
})

describe('transformation interaction and lifecycle integration', () => {
  beforeEach(() => {
    const base = createGame(generateDungeon('transformation-ui'))
    const inventory = grantTransformation(grantTransformation(emptyTransformations(), 'knight', 'light')!, 'bishop', 'dark')!
    usePawnStore.setState({ ...base,progress:null, transformations: inventory, from: base.cell, phase: 'ready', actionId: 0,
      runActive: true, hasStartedRun: true, deathRetentionDone: false, floorNumber: 1, selectedCardId: undefined, selectedAbility: false })
  })
  afterEach(() => vi.unstubAllEnvs())
  it('exposes testing directly from an empty Forms HUD and puts grants before seed controls in production', () => {
    vi.stubEnv('DEV', false)
    usePawnStore.setState({ transformations: emptyTransformations() })
    const state = usePawnStore.getState()
    const hud = renderToStaticMarkup(<TransformationHUD />)
    expect(hud).toContain('aria-controls="dungeon-tools"')
    expect(hud).toContain('>Test forms</button>')
    const tools = renderToStaticMarkup(<DungeonTools />)
    expect(tools).toContain('id="dungeon-tools"')
    expect(tools.indexOf('Transformation testing')).toBeLessThan(tools.indexOf('Seed<input'))
    expect(tools).toContain('Grant / unlock attunement')
    expect(tools).toContain('Grant this form first, then activate it.')
    expect(usePawnStore.getState()).toBe(state)
  })
  it('explains recovery in the testing panel instead of silently rejecting activation', () => {
    usePawnStore.setState({ transformations: { ...usePawnStore.getState().transformations, recovery: 1 } })
    const html = renderToStaticMarkup(<TransformationTools />)
    expect(html).toContain('Recovery in progress.')
    expect(html).toContain('Simulate completed floor until Recovery is 0')
    expect(html).toMatch(/disabled=""[^>]*>Test activation/)
  })
  it('inspecting the HUD preserves charges, time, Energy and enemy state', () => {
    const state = usePawnStore.getState()
    const html = renderToStaticMarkup(<TransformationHUD />)
    expect(html).toContain('Inspect Light')
    expect(html).toContain('Inspect Dark')
    expect(html).toContain('Forms <strong>2/2</strong>')
    expect(html).toContain('data-keyword="charges"')
    expect(usePawnStore.getState()).toBe(state)
  })
  it('activation locks input; only one enemy phase can resolve, and ordinary actions spend no charges', () => {
    const state = usePawnStore.getState()
    expect(state.submitAction({ kind: 'transform', form: 'knight', attunement: 'light' })).toBe(true)
    const player = usePawnStore.getState()
    expect(player.submitAction({ kind: 'wait' })).toBe(false)
    player.advancePlayback(player.actionId, 'player')
    player.advancePlayback(player.actionId, 'player')
    expect(usePawnStore.getState().turn).toBe(1)
    player.advancePlayback(player.actionId, 'enemies')
    const ready = usePawnStore.getState()
    expect(ready.transformations.inventory[0].charges).toBe(4)
    const html = renderToStaticMarkup(<TransformationHUD />)
    expect(html).toContain('Knight')
    expect(html).toContain('Floors Left')
    expect(html).toContain('Light')
    expect(html).toContain('Vaulting Charge')
    ready.selectAbility()
    expect(usePawnStore.getState().turn).toBe(1)
    expect(usePawnStore.getState().energy).toBe(3)
    ready.selectCard(undefined)
    expect(usePawnStore.getState().selectedAbility).toBe(false)
  })
  it('floor hook preserves deck/HP and consumes duration once; reseeding cannot bypass recovery', () => {
    const state = usePawnStore.getState()
    usePawnStore.setState({ transformations: activateTransformation(state.transformations, 'knight', 'light')!, status: 'victory', hp: 7 })
    expect(state.transitionFloor('next')).toBe(true)
    const next = usePawnStore.getState()
    expect(next).toMatchObject({ hp: 7, floorNumber: 2, turn: 0 })
    expect(next.deck).toBe(state.deck)
    expect(next.transformations.active?.floorsLeft).toBe(1)
    expect(next.transitionFloor('duplicate')).toBe(false)
    usePawnStore.setState({ status: 'victory' })
    expect(next.transitionFloor('third')).toBe(true)
    expect(usePawnStore.getState().transformations).toMatchObject({ active: null, recovery: 1 })
    next.loadDungeon('reseed-recovery')
    expect(usePawnStore.getState().transformations.recovery).toBe(1)
  })
  it('Game Over requires exactly one eligible retention before restart; preserves charges and recovery', () => {
    const state = usePawnStore.getState()
    usePawnStore.setState({ transformations: activateTransformation(state.transformations, 'knight', 'light')!, hp: 0, status: 'defeat' })
    const html = renderToStaticMarkup(<GameOver />)
    expect(html).toContain('Keep Knight')
    expect(html).toContain('Keep Bishop')
    expect(html).toMatch(/disabled=""[^>]*>RESTART RUN/)
    const old = usePawnStore.getState().dungeon.seed
    state.restartRun()
    expect(usePawnStore.getState().dungeon.seed).toBe(old)
    expect(state.chooseRetention('rook')).toBe(false)
    expect(state.chooseRetention('knight')).toBe(true)
    expect(state.chooseRetention('bishop')).toBe(false)
    state.restartRun()
    const fresh = usePawnStore.getState()
    expect(fresh.dungeon.seed).not.toBe(old)
    expect(fresh.transformations.inventory).toHaveLength(1)
    expect(fresh.transformations.inventory[0].charges).toBe(4)
    expect(fresh.transformations.active).toBeNull()
    expect(fresh.transformations.recovery).toBe(1)
  })
  it('allows public testing grants, floor/boss simulation and death retention in production', () => {
    vi.stubEnv('DEV', false)
    const state = usePawnStore.getState()
    expect(state.debugGrant('knight', 'dark')).toBe(true)
    expect(usePawnStore.getState().transformations.inventory[0]).toMatchObject({ charges: 5, attunements: ['light', 'dark'] })
    expect(state.debugGrant('rook', 'light')).toBe(false) // Two-slot rule still applies.
    usePawnStore.setState({ transformations: { ...usePawnStore.getState().transformations, reconstruction: { queen: 0 } } })
    state.debugBossWin('queen', 'dark')
    expect(usePawnStore.getState().transformations.reconstruction.queen).toBe(1)
    const visible = usePawnStore.getState().visible, explored = usePawnStore.getState().explored
    state.toggleReveal()
    expect(usePawnStore.getState().revealAll).toBe(true)
    expect(usePawnStore.getState().visible).toBe(visible)
    expect(usePawnStore.getState().explored).toBe(explored)
    expect(state.transitionFloor('public-testing', true)).toBe(true)
    expect(usePawnStore.getState().floorNumber).toBe(2)
    state.debugDefeat()
    expect(usePawnStore.getState().status).toBe('defeat')
    expect(state.transitionFloor('after-death', true)).toBe(false)
  })
  it('public test actions still reject overlapping input and suspended runs', () => {
    vi.stubEnv('DEV', false)
    const state = usePawnStore.getState()
    state.submitAction({ kind: 'wait' })
    const busy = usePawnStore.getState()
    expect(busy.debugGrant('knight', 'dark')).toBe(false)
    busy.debugBossWin('knight', 'dark')
    busy.debugDefeat()
    expect(busy.transitionFloor('busy-floor', true)).toBe(false)
    expect(usePawnStore.getState()).toBe(busy)
    state.loadDungeon('suspended-test')
    state.suspendRun()
    const suspended = usePawnStore.getState()
    expect(suspended.debugGrant('knight', 'dark')).toBe(false)
    suspended.debugBossWin('knight', 'dark')
    suspended.debugDefeat()
    expect(suspended.transitionFloor('suspended-floor', true)).toBe(false)
    expect(usePawnStore.getState()).toBe(suspended)
  })
})

describe('semantic UI contrast', () => {
  it('keeps normal semantic text at least 4.5:1 against both dark panel/background tokens', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8')
    const colors = Object.fromEntries([...css.matchAll(/--ui-([a-z]+):\s*(#[0-9a-f]{6});/g)].map((match) => [match[1], match[2]]))
    function luminance(hex: string) {
      const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    for (const name of ['text', 'secondary', 'attack', 'defense', 'mobility', 'utility', 'energy', 'light', 'dark', 'disabled']) {
      for (const background of ['background', 'panel']) {
        const a = luminance(colors[name]), b = luminance(colors[background])
        expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), `${name} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
