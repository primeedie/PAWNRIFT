import { create } from 'zustand'
import { type Cell } from '../logic/movement'
import { generateDungeon, type LayoutStyle } from '../logic/dungeon'
import { attackTargets, createGame, resolvePlayerAction, resolveEnemyPhase, type GameState, type PlayerAction } from '../logic/combat'
import { newRunSeed } from '../../utils/newRunSeed'

const initialDungeon = generateDungeon('dungeon-in-a-box')

export type TurnPhase = 'ready' | 'player' | 'enemies'
type PawnState = GameState & {
  from: Cell
  isMoving: boolean
  phase: TurnPhase
  actionId: number
  revealAll: boolean
  runActive: boolean
  restartRun: () => void
  suspendRun: () => void
  resumeRun: () => void
  loadDungeon: (seed: string, style?: LayoutStyle) => void
  toggleReveal: () => void
  tryMove: (destination: Cell) => boolean
  tryAttack: (targetId?: string) => boolean
  submitAction: (action: PlayerAction) => boolean
  advancePlayback: (actionId: number, phase: TurnPhase) => void
}

export const usePawnStore = create<PawnState>((set, get) => ({
  ...createGame(initialDungeon),
  from: initialDungeon.spawn,
  isMoving: false,
  phase: 'ready',
  actionId: 0,
  revealAll: false,
  runActive: false,
  restartRun: () => get().loadDungeon(newRunSeed(get().dungeon.seed)),
  suspendRun: () => set((state) => ({ runActive: false, actionId: state.actionId + 1 })),
  resumeRun: () => set((state) => ({ runActive: true, actionId: state.actionId + 1 })),
  loadDungeon: (seed, style) => {
    const dungeon = generateDungeon(seed, style)
    set({ ...createGame(dungeon), from: dungeon.spawn, isMoving: false, phase: 'ready',
      actionId: get().actionId + 1, revealAll: false, runActive: true, lastAction: undefined })
  },
  toggleReveal: () => { if (import.meta.env.DEV) set((state) => ({ revealAll: !state.revealAll })) },
  tryMove: (destination) => get().submitAction({ kind: 'move', destination }),
  tryAttack: (targetId) => {
    const target = targetId ?? attackTargets(get())[0]?.id
    return target ? get().submitAction({ kind: 'attack', targetId: target }) : false
  },
  submitAction: (action) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready') return false
    const player = resolvePlayerAction(state, action)
    if (!player) return false
    set({ ...player, from: state.cell, isMoving: action.kind === 'move', phase: 'player', actionId: state.actionId + 1 })
    return true
  },
  advancePlayback: (id, phase) => {
    const state = get()
    // Stale, duplicate, and pre-regeneration callbacks cannot process a turn twice.
    if (!state.runActive || state.actionId !== id || state.phase !== phase || phase === 'ready') return
    if (state.status === 'defeat' || state.hp <= 0) {
      set({ status: 'defeat', hp: 0, phase: 'ready', isMoving: false, guarding: false, actionId: state.actionId + 1 })
      return
    }
    if (phase === 'player') {
      const resolved = resolveEnemyPhase(state)
      set({ ...resolved, from: state.cell, isMoving: false,
        phase: resolved.status === 'defeat' ? 'ready' : 'enemies',
        actionId: resolved.status === 'defeat' ? state.actionId + 1 : state.actionId })
    }
    else set({ phase: 'ready' })
  },
}))
