import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { combatBalance } from '../data/combatBalance'
import { createGame, resolveEnemyPhase } from '../game/logic/combat'
import { generateDungeon } from '../game/logic/dungeon'
import { useAppStore } from '../game/state/appStore'
import { usePawnStore } from '../game/state/pawnStore'
import { GameOver } from '../ui/GameOver'
import { newRunSeed } from '../utils/newRunSeed'

function lethalTurn() {
  const base = createGame(generateDungeon('terminal-fixture', 'courtyard'))
  const pawn = { column: 3, row: 3 }
  return { ...base, cell: pawn, hp: 1, turn: 4, enemies: [
    { ...base.enemies[0], id: 'a', hp: 6, cell: { column: 4, row: 3 }, intent: 'attack' as const, attackTarget: pawn },
    { ...base.enemies[0], id: 'b', hp: 6, cell: { column: 3, row: 4 }, intent: 'attack' as const, attackTarget: pawn },
  ], dungeon: { ...base.dungeon, tiles: base.dungeon.tiles.map((tile) => ({ ...tile, blocksMovement: false, blocksSight: false })) } }
}

describe('terminal defeat and clean restart', () => {
  beforeEach(() => {
    usePawnStore.getState().loadDungeon('before-restart')
    useAppStore.setState({ screen: 'scene' })
  })
  it('stops the enemy sequence immediately at zero HP and cannot resolve again', () => {
    const dead = resolveEnemyPhase(lethalTurn())
    expect(dead.hp).toBe(0)
    expect(dead.status).toBe('defeat')
    expect(dead.turn).toBe(5)
    expect(dead.events.filter((event) => event.actor === 'b')).toHaveLength(0)
    expect(resolveEnemyPhase(dead)).toBe(dead)
  })
  it('cancels playback at death and rejects every further action and old callback', () => {
    usePawnStore.setState({ ...lethalTurn(), phase: 'player', actionId: 42, isMoving: false, runActive: true })
    const { advancePlayback } = usePawnStore.getState()
    advancePlayback(42, 'player')
    const dead = usePawnStore.getState()
    expect(dead.status).toBe('defeat')
    expect(dead.phase).toBe('ready')
    expect(dead.isMoving).toBe(false)
    expect(dead.submitAction({ kind: 'wait' })).toBe(false)
    expect(dead.submitAction({ kind: 'defend' })).toBe(false)
    expect(dead.tryMove({ column: 2, row: 3 })).toBe(false)
    expect(dead.tryAttack('b')).toBe(false)
    advancePlayback(42, 'player')
    advancePlayback(42, 'enemies')
    expect(usePawnStore.getState()).toBe(dead)
  })
  it('restarts with a fresh seed and resets all temporary run state atomically', () => {
    const old = usePawnStore.getState()
    usePawnStore.setState({ status: 'defeat', hp: 0, turn: 99, guarding: true, lastAction: 'defend',
      occupied: [{ column: 1, row: 1 }], explored: new Set(Array.from({ length: 64 }, (_, id) => id)), revealAll: true })
    old.restartRun()
    const fresh = usePawnStore.getState()
    expect(fresh.dungeon.seed).not.toBe(old.dungeon.seed)
    expect(fresh).toMatchObject({ hp: combatBalance.playerMaxHp, status: 'playing', turn: 0,
      guarding: false, phase: 'ready', isMoving: false, runActive: true, events: [], revealAll: false })
    expect(fresh.occupied).toEqual(fresh.floorContent?.chests.map(chest=>chest.cell)??[])
    expect(fresh.lastAction).toBeUndefined()
    expect(fresh.cell).toEqual(fresh.dungeon.spawn)
    expect(fresh.from).toEqual(fresh.cell)
    expect(fresh.explored).toEqual(fresh.visible)
    expect(fresh.enemies).toHaveLength(1)
    expect(fresh.enemies[0].hp).toBe(combatBalance.enemyMaxHp)
    expect(fresh.enemies[0].intent).toBe('idle')
    expect(fresh.enemies[0].lastSeen).toBeUndefined()
    expect(fresh.enemies[0].attackTarget).toBeUndefined()
    expect(fresh.submitAction({ kind: 'wait' })).toBe(true)
  })
  it('main menu suspends dead runs; Play starts a clean run instead of reopening defeat', () => {
    usePawnStore.setState({ status: 'defeat', hp: 0, phase: 'ready' })
    const oldSeed = usePawnStore.getState().dungeon.seed
    useAppStore.getState().showTitle()
    expect(useAppStore.getState().screen).toBe('title')
    expect(usePawnStore.getState().runActive).toBe(false)
    expect(usePawnStore.getState().submitAction({ kind: 'wait' })).toBe(false)
    useAppStore.getState().play()
    expect(useAppStore.getState().screen).toBe('scene')
    expect(usePawnStore.getState().status).toBe('playing')
    expect(usePawnStore.getState().dungeon.seed).not.toBe(oldSeed)
  })
  it('suspends unfinished turns in menus and resumes exactly one enemy response', () => {
    const before = usePawnStore.getState()
    before.submitAction({ kind: 'wait' })
    const oldId = usePawnStore.getState().actionId
    useAppStore.getState().showTitle()
    const paused = usePawnStore.getState()
    before.advancePlayback(oldId, 'player')
    expect(usePawnStore.getState()).toBe(paused)
    expect(paused.turn).toBe(0)
    useAppStore.getState().play()
    const resumed = usePawnStore.getState()
    expect(resumed.submitAction({ kind: 'wait' })).toBe(false)
    resumed.advancePlayback(resumed.actionId, 'player')
    expect(usePawnStore.getState().turn).toBe(1)
    resumed.advancePlayback(resumed.actionId, 'enemies')
    expect(usePawnStore.getState().phase).toBe('ready')
    expect(usePawnStore.getState().turn).toBe(1)
  })
  it('has exactly one modal title and the two requested controls', () => {
    const markup = renderToStaticMarkup(<GameOver />)
    expect(markup.match(/<dialog /g)).toHaveLength(1)
    expect(markup.match(/GAME OVER/g)).toHaveLength(1)
    expect(markup).toContain('RESTART RUN')
    expect(markup).toContain('MAIN MENU')
    expect(markup).toContain('aria-labelledby="game-over-title"')
  })
  it('guarantees a fresh seed even if random values repeat the previous seed', () => {
    const mock = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array).set([1, 2])
      return array
    })
    expect(newRunSeed('run-1-2')).not.toBe('run-1-2')
    mock.mockRestore()
  })
})
