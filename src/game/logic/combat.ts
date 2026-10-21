import { combatBalance as balance } from '../../data/combatBalance'
import { cardBalance, cards } from '../../data/cards'
import { createStarterDeck, discardAndRefill, type DeckState } from './deck'
import { validCardTarget, type CardTarget } from './cardRules'
import { BOARD_SIZE } from '../../utils/grid'
import { cellId, distancesFrom, type Dungeon } from './dungeon'
import { gridDistance, hasLineOfSight, nextPathStep } from './enemyAI'
import { canMove, canOccupy, directionTo, sameCell, type Cell, type Direction, type MovementRule } from './movement'
import { canSeeContent, updateFog, type FogState } from './visibility'

export type PlayerAction =
  | { kind: 'card'; cardInstanceId: string; target: CardTarget }
  | { kind: 'move'; destination: Cell }
  | { kind: 'attack'; targetId: string }
  | { kind: 'defend' }
  | { kind: 'wait' }
export type Enemy = {
  id: string
  kind: 'rookling'
  cell: Cell
  from: Cell
  hp: number
  maxHp: number
  intent: 'idle' | 'pursue' | 'search' | 'attack'
  lastSeen?: Cell
  attackTarget?: Cell
  searchLeft: number
}
export type CombatEvent = {
  id: number
  kind: 'move' | 'hit' | 'counter' | 'guard' | 'windup' | 'miss' | 'defeat' | 'wait' | 'victory' | 'heal' | 'focus'
  targetId?: string
  actor: 'pawn' | string
  cell: Cell
  amount?: number
  // Presentation may show an enemy event only if this was visible when it happened.
  seen: boolean
}
export type GameState = FogState & {
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
  lastAction?: PlayerAction['kind']
  events: CombatEvent[]
}

export function createGame(dungeon: Dungeon): GameState {
  const open = new Set(dungeon.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
  const reachable = distancesFrom(open, cellId(dungeon.spawn))
  const candidates = dungeon.tiles.filter((tile) => reachable.has(cellId(tile)) && !tile.prop
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
    focus: 0, block: 0, preparedCounter: 0,
    ...updateFog(dungeon.tiles, dungeon.spawn),
  }
}

export function movementBoard(state: GameState) {
  return { size: BOARD_SIZE, available: state.dungeon.tiles,
    blocked: state.dungeon.tiles.filter((tile) => tile.blocksMovement),
    occupied: [...state.occupied, ...state.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.cell)] }
}

export function attackTargets(state: GameState) {
  return state.enemies.filter((enemy) => enemy.hp > 0 && gridDistance(state.cell, enemy.cell) === 1
    && canSeeContent(cellId(enemy.cell), state))
}

// Future forms can supply a different movement predicate; any accepted destination still costs one turn.
export function resolvePlayerAction(state: GameState, action: PlayerAction, movement: MovementRule = canMove): GameState | null {
  if (state.status !== 'playing' || state.hp <= 0) return null
  let cell = state.cell, facing = state.facing
  const enemies = state.enemies.map((enemy) => ({ ...enemy }))
  const events: CombatEvent[] = []
  let eventSerial = state.eventSerial
  const emit = (event: Omit<CombatEvent, 'id'>) => events.push({ ...event, id: ++eventSerial })
  let { hp, energy, focus, deck } = state
  let block = 0, preparedCounter = 0
  const strike = (enemy: Enemy, damage: number) => {
    facing = directionTo(cell, enemy.cell)
    const amount = Math.min(enemy.hp, damage + focus)
    focus = 0
    enemy.hp -= amount
    emit({ kind: 'hit', actor: 'pawn', targetId: enemy.id, cell: enemy.cell, amount, seen: true })
    if (enemy.hp === 0) emit({ kind: 'defeat', actor: enemy.id, cell: enemy.cell, seen: true })
  }
  if (action.kind === 'move') {
    const board = movementBoard(state)
    if (!canOccupy(action.destination, board) || !movement(state.cell, action.destination, board)) return null
    cell = { ...action.destination }
    facing = directionTo(state.cell, cell)
    emit({ kind: 'move', actor: 'pawn', cell, seen: true })
  } else if (action.kind === 'attack') {
    const target = attackTargets(state).find((enemy) => enemy.id === action.targetId)
    if (!target) return null
    const enemy = enemies.find((candidate) => candidate.id === target.id)!
    strike(enemy, balance.playerDamage)
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
  return { ...state, cell, facing, enemies, events, eventSerial, hp, energy, focus, deck, block, preparedCounter,
    guarding: action.kind === 'defend', lastAction: action.kind,
    ...updateFog(state.dungeon.tiles, cell, state.explored) }
}

// Exactly one ordered action per eligible living enemy. No clocks, effects, React, or global randomness.
export function resolveEnemyPhase(state: GameState): GameState {
  if (state.status !== 'playing' || state.hp <= 0) {
    return state.hp <= 0 && state.status !== 'defeat' ? { ...state, hp: 0, status: 'defeat', guarding: false } : state
  }
  const enemies = state.enemies.map((enemy) => ({ ...enemy, from: enemy.cell }))
  const events = [...state.events]
  let hp = state.hp
  let block = state.block, preparedCounter = state.preparedCounter, eventSerial = state.eventSerial
  const emit = (event: Omit<CombatEvent, 'seen' | 'id'>) => events.push({ ...event, id: ++eventSerial,
    seen: event.actor === 'pawn' || canSeeContent(cellId(event.cell), state) })
  for (const enemy of [...enemies].sort((a, b) => a.id.localeCompare(b.id))) {
    if (enemy.hp <= 0 || hp <= 0) continue
    if (enemy.intent === 'attack' && enemy.attackTarget) {
      const hits = sameCell(enemy.attackTarget, state.cell) && gridDistance(enemy.cell, state.cell) === 1
        && hasLineOfSight(state.dungeon, enemy.cell, state.cell)
      if (hits) {
        const incoming = Math.max(0, balance.enemyDamage - (state.guarding ? balance.guardReduction : 0))
        const absorbed = Math.min(block, incoming)
        block -= absorbed
        const damage = Math.min(hp, incoming - absorbed)
        hp -= damage
        emit({ kind: 'hit', actor: enemy.id, targetId: 'pawn', cell: state.cell, amount: damage })
        if (hp > 0 && (state.guarding || preparedCounter > 0)) {
          const counter = Math.min(enemy.hp, state.guarding ? balance.counterDamage : preparedCounter)
          preparedCounter = 0
          enemy.hp -= counter
          emit({ kind: 'counter', actor: 'pawn', targetId: enemy.id, cell: enemy.cell, amount: counter })
          if (enemy.hp === 0) emit({ kind: 'defeat', actor: enemy.id, cell: enemy.cell })
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
  // Status/hazard tick hook: future effects belong here, once per accepted action, before terminal checks.
  const status = hp <= 0 ? 'defeat' : sameCell(state.cell, state.dungeon.exit)
    && enemies.every((enemy) => enemy.hp <= 0) ? 'victory' : 'playing'
  if (status !== 'playing') emit({ kind: status, actor: 'pawn', cell: state.cell })
  return { ...state, enemies, hp, status, events, eventSerial, guarding: false, block: 0, preparedCounter: 0,
    energy: Math.min(state.maxEnergy, state.energy + cardBalance.energyPerTurn), turn: state.turn + 1 }
}

export function resolveTurn(state: GameState, action: PlayerAction, movement?: MovementRule): GameState | null {
  const player = resolvePlayerAction(state, action, movement)
  return player ? resolveEnemyPhase(player) : null
}

export function enemyIntentLabel(enemy: Enemy) {
  return { idle: 'Idle', pursue: 'Approaching', search: 'Searching', attack: 'Strike next turn' }[enemy.intent]
}
