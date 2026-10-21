import { create } from 'zustand'
import { type Cell } from '../logic/movement'
import { generateDungeon, type LayoutStyle } from '../logic/dungeon'
import { attackTargets, createGame, resolvePlayerAction, resolveEnemyPhase, type GameState, type PlayerAction } from '../logic/combat'
import { newRunSeed } from '../../utils/newRunSeed'
import type { CardTarget } from '../logic/cardRules'
import { sameCell } from '../logic/movement'
import { completeTransformationFloor, grantTransformation, recordTransformationBossWin, retainAfterDeath, retentionChoices, transformationsForNewRun } from '../logic/transformations'
import type { Attunement, BossForm } from '../../data/forms'

const initialDungeon = generateDungeon(newRunSeed(''))

export type TurnPhase = 'ready' | 'player' | 'enemies'
type PawnState = GameState & {
  from: Cell
  isMoving: boolean
  phase: TurnPhase
  actionId: number
  revealAll: boolean
  runActive: boolean
  hasStartedRun: boolean
  floorNumber: number
  deathRetentionDone: boolean
  selectedAbility: boolean
  selectAbility: () => void
  tryAbility: (targetId?: string) => boolean
  chooseRetention: (form: BossForm) => boolean
  transitionFloor: (seed: string, testing?: boolean) => boolean
  debugGrant: (form: BossForm, attunement: Attunement) => boolean
  debugBossWin: (form: BossForm, attunement: Attunement) => void
  debugDefeat: () => void
  selectedCardId?: string
  selectCard: (instanceId?: string) => void
  playSelectedCard: (target: CardTarget) => boolean
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
  hasStartedRun: false, floorNumber: 1, deathRetentionDone: false, selectedAbility: false,
  selectAbility: () => {
    const state = get()
    if (state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ selectedAbility: !state.selectedAbility, selectedCardId: undefined })
  },
  tryAbility: (targetId) => get().submitAction({ kind: 'ability', targetId }),
  chooseRetention: (form) => {
    const state = get()
    if (state.status !== 'defeat' || state.deathRetentionDone) return false
    const next = retainAfterDeath(state.transformations, form)
    if (!next) return false
    set({ transformations: next, deathRetentionDone: true })
    return true
  },
  transitionFloor: (seed, testing = false) => {
    const state = get()
    if (state.phase !== 'ready' || state.hp <= 0 || (!state.runActive)
      || (state.status !== 'victory' && !testing)) return false
    const dungeon = generateDungeon(seed)
    set({ ...createGame(dungeon), hp: state.hp, maxHp: state.maxHp, deck: state.deck,
      energy: state.energy, maxEnergy: state.maxEnergy, focus: state.focus, turn: state.turn,
      transformations: completeTransformationFloor(state.transformations), floorNumber: state.floorNumber + 1,
      from: dungeon.spawn, isMoving: false, phase: 'ready', actionId: state.actionId + 1,
      selectedCardId: undefined, selectedAbility: false, revealAll: false, lastAction: undefined })
    return true
  },
  debugGrant: (form, attunement) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready' || state.status !== 'playing') return false
    const next = grantTransformation(state.transformations, form, attunement)
    if (!next) return false
    set({ transformations: next }); return true
  },
  debugBossWin: (form, attunement) => {
    const state = get()
    if (state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ transformations: recordTransformationBossWin(state.transformations, form, attunement) })
  },
  debugDefeat: () => {
    if (get().runActive && get().status === 'playing' && get().phase === 'ready') set((state) => ({ hp: 0, status: 'defeat',
      selectedCardId: undefined, selectedAbility: false, deathRetentionDone: false, actionId: state.actionId + 1 }))
  },
  selectedCardId: undefined,
  selectCard: (instanceId) => {
    const state = get()
    if (instanceId === undefined) { set({ selectedCardId: undefined, selectedAbility: false }); return }
    if (state.runActive && state.phase === 'ready' && state.status === 'playing'
      && state.deck.hand.some((card) => card.instanceId === instanceId))
      set({ selectedCardId: state.selectedCardId === instanceId ? undefined : instanceId, selectedAbility: false })
  },
  playSelectedCard: (target) => {
    const cardInstanceId = get().selectedCardId
    return cardInstanceId ? get().submitAction({ kind: 'card', cardInstanceId, target }) : false
  },
  restartRun: () => get().loadDungeon(newRunSeed(get().dungeon.seed)),
  suspendRun: () => set((state) => ({ runActive: false, selectedCardId: undefined, selectedAbility: false, actionId: state.actionId + 1 })),
  resumeRun: () => set((state) => ({ runActive: true, actionId: state.actionId + 1 })),
  loadDungeon: (seed, style) => {
    const state = get()
    if (state.status === 'defeat' && !state.deathRetentionDone && retentionChoices(state.transformations).length) return
    const retained = state.status === 'defeat' && !state.deathRetentionDone
      ? retainAfterDeath(state.transformations)! : transformationsForNewRun(state.transformations)
    const dungeon = generateDungeon(seed, style)
    set({ ...createGame(dungeon), from: dungeon.spawn, isMoving: false, phase: 'ready',
      transformations: retained, floorNumber: 1, hasStartedRun: true, deathRetentionDone: false, selectedAbility: false,
      actionId: get().actionId + 1, revealAll: false, runActive: true, selectedCardId: undefined, lastAction: undefined })
  },
  toggleReveal: () => set((state) => ({ revealAll: !state.revealAll })),
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
    set({ ...player, selectedCardId: undefined, selectedAbility: false, from: state.cell, isMoving: !sameCell(player.cell, state.cell), phase: 'player', actionId: state.actionId + 1 })
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
