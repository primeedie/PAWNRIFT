import { combatBalance as balance } from '../../data/combatBalance'
import { BOARD_SIZE } from '../../utils/grid'
import { cellId, distancesFrom, type Dungeon } from './dungeon'
import { gridDistance, hasLineOfSight, nextPathStep } from './enemyAI'
import { canMove, canOccupy, directionTo, sameCell, type Cell, type Direction, type MovementRule } from './movement'
import { canSeeContent, updateFog, type FogState } from './visibility'

export type PlayerAction =
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
  kind: 'move' | 'hit' | 'counter' | 'guard' | 'windup' | 'miss' | 'defeat' | 'wait' | 'victory'
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
    occupied: [], turn: 0, status: 'playing', guarding: false, events: [],
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
  if (action.kind === 'move') {
    const board = movementBoard(state)
    if (!canOccupy(action.destination, board) || !movement(state.cell, action.destination, board)) return null
    cell = { ...action.destination }
    facing = directionTo(state.cell, cell)
    events.push({ kind: 'move', actor: 'pawn', cell, seen: true })
  } else if (action.kind === 'attack') {
    const target = attackTargets(state).find((enemy) => enemy.id === action.targetId)
    if (!target) return null
    const enemy = enemies.find((candidate) => candidate.id === target.id)!
    facing = directionTo(cell, enemy.cell)
    const amount = Math.min(enemy.hp, balance.playerDamage)
    enemy.hp -= amount
    events.push({ kind: 'hit', actor: 'pawn', cell: enemy.cell, amount, seen: true })
    if (enemy.hp === 0) events.push({ kind: 'defeat', actor: enemy.id, cell: enemy.cell, seen: true })
  } else if (action.kind === 'defend' || action.kind === 'wait') {
    events.push({ kind: action.kind === 'defend' ? 'guard' : 'wait', actor: 'pawn', cell, seen: true })
  } else return null
  return { ...state, cell, facing, enemies, events, guarding: action.kind === 'defend', lastAction: action.kind,
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
  const emit = (event: Omit<CombatEvent, 'seen'>) => events.push({ ...event,
    seen: event.actor === 'pawn' || canSeeContent(cellId(event.cell), state) })
  for (const enemy of [...enemies].sort((a, b) => a.id.localeCompare(b.id))) {
    if (enemy.hp <= 0 || hp <= 0) continue
    if (enemy.intent === 'attack' && enemy.attackTarget) {
      const hits = sameCell(enemy.attackTarget, state.cell) && gridDistance(enemy.cell, state.cell) === 1
        && hasLineOfSight(state.dungeon, enemy.cell, state.cell)
      if (hits) {
        const damage = Math.min(hp, Math.max(0, balance.enemyDamage - (state.guarding ? balance.guardReduction : 0)))
        hp -= damage
        emit({ kind: 'hit', actor: enemy.id, cell: state.cell, amount: damage })
        if (state.guarding) {
          const counter = Math.min(enemy.hp, balance.counterDamage)
          enemy.hp -= counter
          emit({ kind: 'counter', actor: 'pawn', cell: enemy.cell, amount: counter })
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
  if (status !== 'playing') events.push({ kind: status, actor: 'pawn', cell: state.cell, seen: true })
  return { ...state, enemies, hp, status, events, guarding: false, turn: state.turn + 1 }
}

export function resolveTurn(state: GameState, action: PlayerAction, movement?: MovementRule): GameState | null {
  const player = resolvePlayerAction(state, action, movement)
  return player ? resolveEnemyPhase(player) : null
}

export function enemyIntentLabel(enemy: Enemy) {
  return { idle: 'Idle', pursue: 'Approaching', search: 'Searching', attack: 'Strike next turn' }[enemy.intent]
}
