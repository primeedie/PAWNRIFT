import { combatBalance as balance } from '../../data/combatBalance'
import { cardBalance, cards } from '../../data/cards'
import { createStarterDeck, discardAndRefill, type DeckState } from './deck'
import { validCardTarget, type CardTarget } from './cardRules'
import { cellId, cellFromId, distancesFrom, neighborIds, type Dungeon } from './dungeon'
import { gridDistance, hasLineOfSight, nextPathStep } from './enemyAI'
import { canOccupy, directionTo, sameCell, type Cell, type Direction, type MovementRule } from './movement'
import { canSeeContent, updateFog, type FogState } from './visibility'
import { formBalance, type BossForm, type Attunement } from '../../data/forms'
import { activateTransformation, currentForm, emptyTransformations, endActivation, type TransformationState } from './transformations'
import { formMovement } from './chessMovement'
import { formAttackTargets } from './formCombat'
import { emptySignatures, finishSignatureTurn, resolveSignature, signatureFog, type SignatureState } from './signatures'
import { canKnightLand, elevationAt, pawnLanding, playerBoard, reversionReason } from './perching'
import { characterTiming } from '../../data/characterDesigns'
import { passiveBalance } from '../../data/passives'
import { cloneEnemy } from './damage'
import { afterBasic, emitDamage, emptyPassives, smiteBudget, tickEnemyStatuses, skipConcussedResponse, type PassiveState, type DamageEffect } from './passives'
import { resolveRoyalDecree } from './signatures'
import { abilityBalance } from '../../data/abilities'

export type PlayerAction =
  | { kind: 'transform'; form: BossForm; attunement: Attunement }
  | { kind: 'ability'; targetId?: string; destination?: Cell }
  | { kind: 'revert' }
  | { kind: 'card'; cardInstanceId: string; target: CardTarget }
  | { kind: 'move'; destination: Cell }
  | { kind: 'attack'; targetId: string }
  | { kind: 'defend' }
  | { kind: 'wait' }
export type Enemy = {
  id: string
  kind: 'rookling' | 'dummy'
  trainingDummy?: { behavior: 'passive' | 'sparring'; knockback: boolean }
  cell: Cell
  from: Cell
  hp: number
  maxHp: number
  intent: 'idle' | 'pursue' | 'search' | 'attack'
  lastSeen?: Cell
  attackTarget?: Cell
  searchLeft: number
  exposedTurns?: number
  fearTurns?: number
  weakenedDamage?: number
  boss?: boolean
  elite?: boolean
  uninterruptible?: boolean
  defense?: number
  block?: number
  burn?: { turnsLeft: number; appliedTurn: number }
  bleed?: { turnsLeft: number; appliedTurn: number }[]
  concussion?: number
  stunImmunity?: number
  stunned?: boolean
}
export type CombatEvent = {
  id: number
  kind: 'move' | 'hit' | 'counter' | 'guard' | 'windup' | 'miss' | 'defeat' | 'wait' | 'victory' | 'heal' | 'focus' | 'transform' | 'revert' | 'reveal' | 'fear' | 'parry' | 'stun'
  targetId?: string
  actor: 'pawn' | string
  cell: Cell
  amount?: number
  blocked?: number
  penetrated?: number
  effect?: DamageEffect
  delayMs?: number
  breakdown?: import('./combatAnalysis').DamageBreakdown
  // Presentation may show an enemy event only if this was visible when it happened.
  seen: boolean
}
export type GameState = FogState & {
  mode?: 'run' | 'training'
  trainingVision?: 'full' | 'fog'
  dungeon: Dungeon
  cell: Cell
  facing: Direction
  hp: number
  maxHp: number
  enemies: Enemy[]
  occupied: readonly Cell[]
  turn: number
  status: 'playing' | 'defeat' | 'victory'
  guarding: boolean
  deck: DeckState
  energy: number
  maxEnergy: number
  focus: number
  block: number
  preparedCounter: number
  eventSerial: number
  transformations: TransformationState
  passives: PassiveState
  signatures: SignatureState
  elevation: number
  lastAction?: PlayerAction['kind']
  events: CombatEvent[]
}

export function createGame(dungeon: Dungeon): GameState {
  const open = new Set(dungeon.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
  const reachable = distancesFrom(open, cellId(dungeon.spawn))
  const candidates = dungeon.tiles.filter((tile) => (reachable.get(cellId(tile)) ?? 0) >= 2 && !tile.prop
    && !sameCell(tile, dungeon.spawn) && !sameCell(tile, dungeon.exit))
  const reservation = dungeon.reservations.find((cell) => cell.kind === 'enemy')
  const spawn = candidates.find((cell) => reservation && sameCell(cell, reservation))
    ?? candidates.sort((a, b) => reachable.get(cellId(b))! - reachable.get(cellId(a))! || cellId(a) - cellId(b))[0]
  const cell = spawn && { column: spawn.column, row: spawn.row }
  return {
    dungeon, cell: dungeon.spawn, facing: 'south', hp: balance.playerMaxHp, maxHp: balance.playerMaxHp,
    enemies: cell ? [{ id: 'rookling-1', kind: 'rookling', cell, from: cell, hp: balance.enemyMaxHp,
      maxHp: balance.enemyMaxHp, intent: 'idle', searchLeft: 0 }] : [],
    occupied: [], turn: 0, status: 'playing', guarding: false, events: [], eventSerial: 0,
    deck: createStarterDeck(dungeon.seed), energy: cardBalance.maxEnergy, maxEnergy: cardBalance.maxEnergy,
    focus: 0, block: 0, preparedCounter: 0, passives: emptyPassives(), transformations: emptyTransformations(), signatures: emptySignatures(), elevation: 0,
    ...updateFog(dungeon.tiles, dungeon.spawn),
  }
}

export function movementBoard(state: GameState) {
  return playerBoard(state)
}

export function attackTargets(state: GameState) {
  return formAttackTargets(state)
}

// Future forms can supply a different movement predicate; any accepted destination still costs one turn.
export function resolvePlayerAction(state: GameState, action: PlayerAction, movement?: MovementRule): GameState | null {
  if (state.status !== 'playing' || state.hp <= 0) return null
  if (action.kind === 'ability') return resolveSignature(state, action)
  let cell = state.cell, facing = state.facing
  const enemies = state.enemies.map(cloneEnemy)
  const events: CombatEvent[] = []
  let eventSerial = state.eventSerial
  const emit = (event: Omit<CombatEvent, 'id'>) => events.push({ ...event, id: ++eventSerial })
  let { hp, energy, focus, deck } = state
  let transformations = state.transformations
  const passives = { ...state.passives }
  const form = currentForm(transformations)
  const light = transformations.active?.attunement === 'light'
  const dark = transformations.active?.attunement === 'dark'
  let block = 0, preparedCounter = 0
  const strike = (enemy: Enemy, damage: number, basic = false) => {
    facing = directionTo(cell, enemy.cell)
    const bonus = form === 'pawn' ? basic ? passives.sharpener : Math.min(passives.sharpener, passiveBalance.sharpenerSkillCap) : 0
    const smite = form === 'king' ? smiteBudget(passives, state.turn) : 0
    const effect = form === 'knight' && basic ? 'pierce' : form === 'bishop' && basic ? 'splash'
      : form === 'rook' && basic ? 'concussion' : form === 'queen' && basic ? 'severance' : form === 'king' ? 'smite' : undefined
    emitDamage(enemy, [damage + focus + smite, ...(bonus ? [bonus] : [])],
      (event) => emit({ ...event, seen: true }), { effect, followup: form === 'pawn' && (basic || bonus > 0),
        impactDelayMs: basic ? characterTiming[form === 'king' ? 'pawn' : form].impact : 0,
        penetration: form === 'knight' && basic ? passiveBalance.penetration : 0,
        inputs: [{ source: basic ? form + ' basic' : action.kind === 'card' ? cards[state.deck.hand.find((card) => card.instanceId === action.cardInstanceId)!.definitionId].name : 'Skill',
          category: basic ? 'basic' : 'card', base: damage - (basic && light && form !== 'pawn' ? formBalance.lightDamage : 0),
          attunementName: transformations.active?.attunement, attunement: basic && light && form !== 'pawn' ? formBalance.lightDamage : 0, focus, passive: smite }] })
    focus = 0
    if (basic) afterBasic({ ...state, cell, enemies, passives }, enemy, (event) => emit({ ...event, seen: true }))
  }
  if (action.kind === 'move') {
    const board = movementBoard(state)
    const rule = movement ?? formMovement(form)
    if (!(canOccupy(action.destination, board) || (form === 'knight' && canKnightLand(action.destination, board)))
      || !rule(state.cell, action.destination, board)) return null
    cell = { ...action.destination }
    facing = directionTo(state.cell, cell)
    emit({ kind: 'move', actor: 'pawn', cell, seen: true })
  } else if (action.kind === 'attack') {
    const target = attackTargets(state).find((enemy) => enemy.id === action.targetId)
    if (!target) return null
    const enemy = enemies.find((candidate) => candidate.id === target.id)!
    strike(enemy, form === 'pawn' ? balance.playerDamage : formBalance[form].damage + (light ? formBalance.lightDamage : 0), true)
    block = (form === 'rook' ? formBalance.rook.basicBlock : 0) + (dark ? formBalance.darkBlock : 0)
  } else if (action.kind === 'transform') {
    const next = activateTransformation(transformations, action.form, action.attunement)
    if (!next) return null
    transformations = next
    if (action.form === 'king') { passives.smite = 0; passives.kingBasics = 0; passives.smiteTurn = undefined; passives.smiteSpent = 0 }
    emit({ kind: 'transform', actor: 'pawn', cell, seen: true })
  } else if (action.kind === 'revert') {
    if (reversionReason(state)) return null
    cell = { ...pawnLanding(state)! }
    facing = directionTo(state.cell, cell)
    transformations = endActivation(transformations, true)
    passives.smite = 0; passives.kingBasics = 0; passives.smiteTurn = undefined; passives.smiteSpent = 0
    emit({ kind: 'revert', actor: 'pawn', cell, seen: true })
  } else if (action.kind === 'card') {
    if (!validCardTarget(state, action.cardInstanceId, action.target)) return null
    const instance = state.deck.hand.find((entry) => entry.instanceId === action.cardInstanceId)!
    const card = cards[instance.definitionId]
    energy -= card.cost // Validate against pre-action energy; recovery belongs to the completed world turn.
    const effect = card.effect
    if (effect.kind === 'damage' && action.target.kind === 'enemy') {
      const targetId = action.target.enemyId
      strike(enemies.find((enemy) => enemy.id === targetId)!, effect.amount)
    } else if (effect.kind === 'move' && action.target.kind === 'tile') {
      cell = { ...action.target.cell }
      facing = directionTo(state.cell, cell)
      block = effect.block
      emit({ kind: 'move', actor: 'pawn', cell, seen: true })
    } else if (effect.kind === 'block' || effect.kind === 'counter') {
      block = effect.kind === 'block' ? effect.amount : effect.block
      preparedCounter = effect.kind === 'counter' ? effect.amount : 0
      emit({ kind: 'guard', actor: 'pawn', cell, seen: true })
    } else if (effect.kind === 'focus') {
      focus = Math.min(cardBalance.maxFocus, focus + effect.amount)
      emit({ kind: 'focus', actor: 'pawn', cell, amount: effect.amount, seen: true })
    } else if (effect.kind === 'heal') {
      const amount = Math.min(state.maxHp - hp, effect.amount)
      hp += amount
      emit({ kind: 'heal', actor: 'pawn', targetId: 'pawn', cell, amount, seen: true })
    }
    deck = discardAndRefill(deck, action.cardInstanceId)
  } else if (action.kind === 'defend' || action.kind === 'wait') {
    emit({ kind: action.kind === 'defend' ? 'guard' : 'wait', actor: 'pawn', cell, seen: true })
  } else return null
  const next = { ...state, passives, cell, facing, enemies, events, eventSerial, hp, energy, focus, deck, block, preparedCounter, transformations,
    elevation: currentForm(transformations) === 'knight' ? elevationAt(state.dungeon, cell) : 0,
    signatures: { ...state.signatures, usedThisTurn: undefined, parryReady: false },
    guarding: action.kind === 'defend', lastAction: action.kind }
  return { ...next, ...signatureFog(next) }
}

// Exactly one ordered action per eligible living enemy. No clocks, effects, React, or global randomness.
export function resolveEnemyPhase(state: GameState): GameState {
  if (state.status !== 'playing' || state.hp <= 0) {
    return state.hp <= 0 && state.status !== 'defeat' ? { ...state, passives: emptyPassives(), hp: 0, status: 'defeat', guarding: false } : state
  }
  const enemies = state.enemies.map((enemy) => ({ ...cloneEnemy(enemy), from: enemy.cell }))
  const passives = { ...state.passives }
  const events = [...state.events]
  let hp = state.hp
  let block = state.block, preparedCounter = state.preparedCounter, eventSerial = state.eventSerial
  let parryReady = state.signatures.parryReady
  let poiseUsed = false
  const king = currentForm(state.transformations) === 'king'
  const emit = (event: Omit<CombatEvent, 'seen' | 'id'>) => events.push({ ...event, id: ++eventSerial,
    seen: event.targetId === 'pawn' || (event.actor === 'pawn' && !event.targetId) || canSeeContent(cellId(event.cell), state) })
  for (const enemy of [...enemies].sort((a, b) => a.id.localeCompare(b.id))) {
    if (enemy.hp <= 0 || hp <= 0) continue
    tickEnemyStatuses(enemy, state.turn, emit)
    if (enemy.hp <= 0) continue
    if (skipConcussedResponse(enemy)) { emit({ kind: 'stun', actor: enemy.id, cell: enemy.cell, effect: 'concussion' }); continue }
    if (enemy.uninterruptible) continue
    if ((enemy.fearTurns ?? 0) > 0 && !enemy.boss) {
      const board = movementBoard({ ...state, enemies })
      const distance = gridDistance(enemy.cell, state.cell)
      const retreat = enemy.kind === 'dummy' ? undefined : neighborIds(cellId(enemy.cell)).map(cellFromId).filter((cell) => !sameCell(cell, state.cell)
        && canOccupy(cell, board) && gridDistance(cell, state.cell) > distance)
        .sort((a, b) => gridDistance(b, state.cell) - gridDistance(a, state.cell) || cellId(a) - cellId(b))[0]
      enemy.fearTurns = 0; enemy.attackTarget = undefined; enemy.intent = 'idle'
      if (retreat) { enemy.cell = retreat; emit({ kind: 'move', actor: enemy.id, cell: retreat }) }
      else emit({ kind: 'fear', actor: enemy.id, cell: enemy.cell })
      continue
    }
    if (enemy.kind === 'dummy' && enemy.trainingDummy?.behavior === 'passive') { emit({ kind: 'wait', actor: enemy.id, cell: enemy.cell }); continue }
    if (enemy.intent === 'attack' && enemy.attackTarget) {
      const hits = sameCell(enemy.attackTarget, state.cell) && gridDistance(enemy.cell, state.cell) === 1
        && hasLineOfSight(state.dungeon, enemy.cell, state.cell)
      if (hits) {
        const parried = parryReady
        parryReady = false
        const poise = king && !poiseUsed && !parried ? passiveBalance.kingPoise : 0
        if (poise) poiseUsed = true
        const incoming = parried ? 0 : Math.max(0, balance.enemyDamage - poise - (enemy.weakenedDamage ?? 0) - (state.guarding ? balance.guardReduction : 0))
        enemy.weakenedDamage = 0
        const absorbed = Math.min(block, incoming)
        block -= absorbed
        const damage = Math.min(hp, incoming - absorbed)
        hp -= damage
        if (parried) emit({ kind: 'parry', actor: 'pawn', targetId: 'pawn', cell: state.cell })
        else emit({ kind: 'hit', actor: enemy.id, targetId: 'pawn', cell: state.cell, amount: damage, blocked: absorbed })
        if (hp > 0 && (parried || state.guarding || preparedCounter > 0)
          && gridDistance(enemy.cell, state.cell) <= abilityBalance.retaliationRange && hasLineOfSight(state.dungeon, state.cell, enemy.cell)) {
          const counterBase = parried ? abilityBalance.pawnCounter : state.guarding ? balance.counterDamage : preparedCounter
          const bonus = currentForm(state.transformations) === 'pawn' && parried ? Math.min(passives.sharpener, passiveBalance.sharpenerSkillCap) : 0
          const smite = king ? smiteBudget(passives, state.turn) : 0
          emitDamage(enemy, [counterBase + smite, ...(bonus ? [bonus] : [])],
            (event) => emit(event.kind === 'hit' && event.effect !== 'sharpener' ? { ...event, kind: 'counter' } : event), { followup: false, impactDelayMs: 75, inputs: [{ source: parried ? 'Crimson Reversal' : state.guarding ? 'Guard counter' : state.lastAction === 'ability' ? 'Iron Bastion' : 'Riposte', category: 'counter', base: counterBase, passive: smite }] })
          preparedCounter = 0
        }
      } else emit({ kind: 'miss', actor: enemy.id, cell: enemy.attackTarget })
      enemy.attackTarget = undefined
      enemy.intent = 'idle'
      continue
    }
    const detects = gridDistance(enemy.cell, state.cell) <= balance.detectionRadius
      && hasLineOfSight(state.dungeon, enemy.cell, state.cell)
    if (detects) {
      enemy.lastSeen = { ...state.cell }
      enemy.searchLeft = balance.searchTurns
      if (gridDistance(enemy.cell, state.cell) === 1) {
        enemy.intent = 'attack'
        enemy.attackTarget = { ...state.cell }
        emit({ kind: 'windup', actor: enemy.id, cell: enemy.cell })
        continue
      }
    }
    if (enemy.kind === 'dummy') { enemy.intent = 'idle'; emit({ kind: 'wait', actor: enemy.id, cell: enemy.cell }); continue }
    if (!enemy.lastSeen) { enemy.intent = 'idle'; continue }
    const occupied = [...state.occupied, ...enemies.filter((other) => other !== enemy && other.hp > 0).map((other) => other.cell)]
    const step = nextPathStep(state.dungeon, enemy.cell, enemy.lastSeen, occupied)
    if (step && !sameCell(step, state.cell)) {
      enemy.cell = step
      enemy.intent = detects ? 'pursue' : 'search'
      emit({ kind: 'move', actor: enemy.id, cell: step })
    } else {
      enemy.intent = 'search'
      if (!detects) enemy.searchLeft--
      if (enemy.searchLeft <= 0) { enemy.intent = 'idle'; enemy.lastSeen = undefined }
    }
  }
  // Decree winds up through the complete response. Defeat cancels it before any shockwave.
  const decree = hp > 0 ? resolveRoyalDecree({ ...state, enemies, hp, events, eventSerial, passives }) : undefined
  if (decree) eventSerial = decree.eventSerial
  const status = hp <= 0 ? 'defeat' : state.mode !== 'training' && sameCell(state.cell, state.dungeon.exit)
    && enemies.every((enemy) => enemy.hp <= 0) ? 'victory' : 'playing'
  if (status !== 'playing') emit({ kind: status, actor: 'pawn', cell: state.cell })
  return finishSignatureTurn({ ...state, signatures: { ...state.signatures, decree: undefined }, passives: hp <= 0 ? emptyPassives() : passives, enemies, hp, status, events, eventSerial, guarding: false, block: 0, preparedCounter: 0,
    focus: decree?.focus ?? state.focus, energy: Math.min(state.maxEnergy, state.energy + cardBalance.energyPerTurn), turn: state.turn + 1 })
}

export function resolveTurn(state: GameState, action: PlayerAction, movement?: MovementRule): GameState | null {
  const player = resolvePlayerAction(state, action, movement)
  return player ? resolveEnemyPhase(player) : null
}

export function enemyIntentLabel(enemy: Enemy) {
  return { idle: 'Idle', pursue: 'Approaching', search: 'Searching', attack: 'Strike next turn' }[enemy.intent]
}

// Reuse the deterministic resolver for one response only, without mutating or exposing future state.
export function foresightIntent(state: GameState, id: string): string | undefined {
  const enemy = state.enemies.find((entry) => entry.id === id)
  if (!enemy || enemy.hp <= 0 || !state.signatures.reveal?.foresight
    || !state.signatures.reveal.cells.includes(cellId(enemy.cell)) || !canSeeContent(cellId(enemy.cell), state)) return
  const projected = resolveEnemyPhase({ ...state, events: [] })
  const action = projected.events.find((event) => event.actor === id)
  return action ? ({ hit: 'Strike marked tile', miss: 'Strike marked tile', windup: 'Prepare a strike', move: 'Move one tile', fear: 'Hesitate' } as Record<string, string>)[action.kind] ?? 'Wait' : 'Wait'
}
