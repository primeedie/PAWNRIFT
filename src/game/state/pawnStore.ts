import { createTraining, trainingControl, type TrainingCommand, type TrainingSession } from '../logic/training'
import { recordAnalysis } from '../logic/combatAnalysis'
import { create } from 'zustand'
import { type Cell } from '../logic/movement'
import { floorSeed, generateDungeon, type LayoutStyle } from '../logic/dungeon'
import { attackTargets, createGame, resolvePlayerAction, resolveEnemyPhase, type GameState, type PlayerAction } from '../logic/combat'
import { newRunSeed } from '../../utils/newRunSeed'
import type { CardTarget } from '../logic/cardRules'
import { sameCell } from '../logic/movement'
import { completeTransformationFloor, grantTransformation, recordTransformationBossWin, retainAfterDeath, retentionChoices, transformationsForNewRun } from '../logic/transformations'
import type { Attunement, BossForm } from '../../data/forms'
import { emptyPassives } from '../logic/passives'
import { emptySignatures, vaultDestinations } from '../logic/signatures'
import { applyPlaytest, movementRejection, PLAYTEST_TOOLS_ENABLED, type PlaytestAction, type DiagnosticLayer } from '../logic/playtesting'

const initialDungeon = generateDungeon(newRunSeed(''))

export type TurnPhase = 'ready' | 'player' | 'enemies'
type PawnState = GameState & {
  training: TrainingSession | null
  enterTraining: () => boolean
  leaveTraining: () => boolean
  train: (command: TrainingCommand) => boolean
  from: Cell
  fromElevation: number
  isMoving: boolean
  phase: TurnPhase
  actionId: number
  revealAll: boolean
  runActive: boolean
  hasStartedRun: boolean
  floorNumber: number
  masterSeed: string
  playtestMode: boolean
  diagnosticLayers: DiagnosticLayer[]
  diagnosticsEnabled: boolean
  setDiagnostics: (enabled: boolean) => void
  lastMovementRejection?: string
  recordInputBlocked: () => void
  playtest: (action: PlaytestAction) => boolean
  regenerateFloor: (seed?: string, style?: LayoutStyle) => boolean
  toggleDiagnostic: (layer: DiagnosticLayer) => void
  deathRetentionDone: boolean
  selectedAbility: boolean
  abilityDestination?: Cell
  selectAbilityDestination: (cell: Cell) => boolean
  selectAbility: () => void
  tryAbility: (targetId?: string) => boolean
  chooseRetention: (form: BossForm) => boolean
  transitionFloor: (seed?: string, testing?: boolean) => boolean
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

// Complete data-only snapshot. Functions stay on the store; all gameplay data is deep copied.
let savedRun: Partial<PawnState> | undefined
let trainingId = 0
export const usePawnStore = create<PawnState>((set, get) => ({
  ...createGame(initialDungeon),
  training: null,
  enterTraining: () => {
    const state = get()
    if (state.training || state.phase !== 'ready') return false
    savedRun = structuredClone(Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value !== 'function'))) as Partial<PawnState>
    const fresh = createTraining(++trainingId)
    set({ ...fresh.game, training: fresh.session, from: fresh.game.cell, fromElevation: 0, isMoving: false, phase: 'ready',
      actionId: state.actionId + 1, runActive: true, revealAll: false, selectedCardId: undefined, selectedAbility: false,
      abilityDestination: undefined, diagnosticLayers: [], diagnosticsEnabled: false, lastMovementRejection: undefined, lastAction: undefined })
    return true
  },
  leaveTraining: () => {
    const state = get()
    if (!state.training || !savedRun) return false
    const methods = Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value === 'function'))
    const restore = savedRun; savedRun = undefined
    set({ ...methods, ...restore, training: null, actionId: state.actionId + 1 } as PawnState, true)
    return true
  },
  train: (command) => {
    const state = get()
    if (!state.training || state.phase !== 'ready') return false
    const result = trainingControl(state, state.training, command)
    if (!result) return false
    set({ ...result.game, training: result.session, actionId: state.actionId + 1, from: result.game.cell,
      fromElevation: result.game.elevation, isMoving: false, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined })
    return true
  },
  from: initialDungeon.spawn,
  fromElevation: 0,
  isMoving: false,
  phase: 'ready',
  actionId: 0,
  revealAll: false,
  runActive: false,
  hasStartedRun: false, floorNumber: 1, deathRetentionDone: false, selectedAbility: false,
  masterSeed: initialDungeon.seed, playtestMode: false, diagnosticLayers: [], diagnosticsEnabled: false,
  setDiagnostics: (enabled) => set({ diagnosticsEnabled: enabled }),
  recordInputBlocked: () => { if (get().diagnosticsEnabled && get().status === 'playing') set({ lastMovementRejection: 'Input blocked by active UI' }) },
  toggleDiagnostic: (layer) => set((state) => ({ playtestMode: true, diagnosticLayers: state.diagnosticLayers.includes(layer)
    ? state.diagnosticLayers.filter((entry) => entry !== layer) : [...state.diagnosticLayers, layer] })),
  playtest: (action) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready') return false
    const next = applyPlaytest(state, action)
    if (!next) return false
    set({ ...next, playtestMode: true, from: next.cell, fromElevation: next.elevation, isMoving: false,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, actionId: state.actionId + 1 })
    return true
  },
  regenerateFloor: (seed, style) => {
    const state = get()
    if (state.training || !state.runActive || state.phase !== 'ready' || state.hp <= 0) return false
    const dungeon = generateDungeon(seed ?? state.dungeon.seed, style ?? (seed === undefined ? state.dungeon.style : undefined))
    set({ ...createGame(dungeon), hp: state.hp, maxHp: state.maxHp, deck: state.deck, energy: state.energy, maxEnergy: state.maxEnergy,
      focus: state.focus, turn: state.turn, transformations: state.transformations, passives: { ...state.passives },
      signatures: { ...emptySignatures(), cooldowns: { ...state.signatures.cooldowns }, eyeUsed: state.signatures.eyeUsed, samuraiCharges: state.signatures.samuraiCharges },
      from: dungeon.spawn, fromElevation: 0, isMoving: false, phase: 'ready', actionId: state.actionId + 1, playtestMode: true,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, revealAll: false, lastAction: undefined, lastMovementRejection: undefined })
    return true
  },
  selectAbility: () => {
    const state = get()
    if (state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ selectedAbility: !state.selectedAbility, selectedCardId: undefined, abilityDestination: undefined })
  },
  selectAbilityDestination: (cell) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready' || !state.selectedAbility
      || state.transformations.active?.form !== 'knight' || !vaultDestinations(state).some((candidate) => sameCell(candidate, cell))) return false
    set({ abilityDestination: cell }); return true
  },
  tryAbility: (targetId) => get().submitAction({ kind: 'ability', targetId, destination: get().abilityDestination }),
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
    if (state.training) return false
    if ((testing && !PLAYTEST_TOOLS_ENABLED) || state.phase !== 'ready' || state.hp <= 0 || (!state.runActive)
      || (state.status !== 'victory' && !testing)) return false
    const dungeon = generateDungeon(seed ?? floorSeed(state.masterSeed, state.floorNumber + 1))
    set({ ...createGame(dungeon), hp: state.hp, maxHp: state.maxHp, deck: state.deck,
      energy: state.energy, maxEnergy: state.maxEnergy, focus: state.focus, turn: state.turn,
      passives: { ...emptyPassives(), ...(state.transformations.active?.form === 'king' && state.transformations.active.floorsLeft > 1
        ? { smite: state.passives.smite, kingBasics: state.passives.kingBasics } : {}) },
      transformations: completeTransformationFloor(state.transformations), floorNumber: state.floorNumber + 1,
      playtestMode: state.playtestMode || testing,
      signatures: { ...emptySignatures(), cooldowns: { ...state.signatures.cooldowns } },
      from: dungeon.spawn, fromElevation: 0, isMoving: false, phase: 'ready', actionId: state.actionId + 1,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, revealAll: false, lastAction: undefined })
    return true
  },
  debugGrant: (form, attunement) => {
    const state = get()
    if (form === 'king' && !state.training) return false
    if (!PLAYTEST_TOOLS_ENABLED || !state.runActive || state.phase !== 'ready' || state.status !== 'playing') return false
    const next = grantTransformation(state.transformations, form, attunement)
    if (!next) return false
    set({ transformations: next, playtestMode: true }); return true
  },
  debugBossWin: (form, attunement) => {
    const state = get()
    if (!state.training && PLAYTEST_TOOLS_ENABLED && state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ transformations: recordTransformationBossWin(state.transformations, form, attunement), playtestMode: true })
  },
  debugDefeat: () => {
    if (PLAYTEST_TOOLS_ENABLED && get().runActive && get().status === 'playing' && get().phase === 'ready') set((state) => ({ hp: 0, status: 'defeat', passives: emptyPassives(), signatures:{...state.signatures,samuraiCharges:0,parryReady:false},
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, deathRetentionDone: false, playtestMode: true, actionId: state.actionId + 1 }))
  },
  selectedCardId: undefined,
  selectCard: (instanceId) => {
    const state = get()
    if (instanceId === undefined) { set({ selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined }); return }
    if (state.runActive && state.phase === 'ready' && state.status === 'playing'
      && state.deck.hand.some((card) => card.instanceId === instanceId))
      set({ selectedCardId: state.selectedCardId === instanceId ? undefined : instanceId, selectedAbility: false, abilityDestination: undefined })
  },
  playSelectedCard: (target) => {
    const cardInstanceId = get().selectedCardId
    return cardInstanceId ? get().submitAction({ kind: 'card', cardInstanceId, target }) : false
  },
  restartRun: () => { const state = get(); if (state.training) state.train({ kind: 'reset' }); else state.loadDungeon(newRunSeed(state.dungeon.seed)) },
  suspendRun: () => set((state) => ({ runActive: false, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, actionId: state.actionId + 1 })),
  resumeRun: () => set((state) => ({ runActive: true, actionId: state.actionId + 1 })),
  loadDungeon: (seed, style) => {
    const state = get()
    if (state.training) return
    if (state.status === 'defeat' && !state.deathRetentionDone && retentionChoices(state.transformations).length) return
    const retained = state.status === 'defeat' && !state.deathRetentionDone
      ? retainAfterDeath(state.transformations)! : transformationsForNewRun(state.transformations)
    const dungeon = generateDungeon(seed, style)
    set({ ...createGame(dungeon), from: dungeon.spawn, fromElevation: 0, isMoving: false, phase: 'ready',
      transformations: transformationsForNewRun(retained), floorNumber: 1, masterSeed: seed, hasStartedRun: true, deathRetentionDone: false, selectedAbility: false, abilityDestination: undefined,
      playtestMode: state.playtestMode && retained.inventory.length > 0, diagnosticLayers: [], diagnosticsEnabled: false, lastMovementRejection: undefined,
      actionId: get().actionId + 1, revealAll: false, runActive: true, selectedCardId: undefined, lastAction: undefined })
  },
  toggleReveal: () => set((state) => ({ revealAll: !state.revealAll, playtestMode: true })),
  tryMove: (destination) => get().submitAction({ kind: 'move', destination }),
  tryAttack: (targetId) => {
    const target = targetId ?? attackTargets(get())[0]?.id
    return target ? get().submitAction({ kind: 'attack', targetId: target }) : false
  },
  submitAction: (action) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready') {
      if (action.kind === 'move' && state.diagnosticsEnabled && state.status === 'playing') set({ lastMovementRejection: !state.runActive ? 'Run suspended' : 'Action resolving' })
      return false
    }
    const player = resolvePlayerAction(state, action)
    if (!player) {
      if (action.kind === 'move' && state.diagnosticsEnabled && state.status === 'playing') set({ lastMovementRejection: movementRejection(state, action.destination) ?? 'Move rejected' })
      return false
    }
    set({ ...player, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined,
      lastMovementRejection: undefined,
      from: state.cell, fromElevation: state.elevation, isMoving: !sameCell(player.cell, state.cell), phase: 'player', actionId: state.actionId + 1 })
    return true
  },
  advancePlayback: (id, phase) => {
    const state = get()
    // Stale, duplicate, and pre-regeneration callbacks cannot process a turn twice.
    if (!state.runActive || state.actionId !== id || state.phase !== phase || phase === 'ready') return
    if (state.status === 'defeat' || state.hp <= 0) {
      set({ status: 'defeat', hp: 0, passives: emptyPassives(), signatures:{...state.signatures,samuraiCharges:0,parryReady:false}, phase: 'ready', isMoving: false, guarding: false, actionId: state.actionId + 1 })
      return
    }
    if (phase === 'player') {
      const resolved = resolveEnemyPhase(state)
      set({ ...resolved, training: state.training ? { ...state.training, analysis: recordAnalysis(state.training.analysis, resolved.events, state.actionId) } : null, from: state.cell, isMoving: false,
        phase: resolved.status === 'defeat' ? 'ready' : 'enemies',
        actionId: resolved.status === 'defeat' ? state.actionId + 1 : state.actionId })
    }
    else set({ phase: 'ready' })
  },
}))
