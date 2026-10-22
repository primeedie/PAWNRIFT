import { passiveBalance as balance } from '../../data/passives'
import type { CombatEvent, Enemy, GameState } from './combat'
import { cellId } from './dungeon'
import { canOccupy, isAdjacent, type Cell } from './movement'
import { hasLineOfSight } from './enemyAI'
import { checkerIndex } from '../../data/terrainPalette'
import { clearDeadStatuses, damageAttack } from './damage'

export type PassiveState = { sharpener: number; smite: number; kingBasics: number; smiteTurn?: number; smiteSpent?: number }
export const emptyPassives = (): PassiveState => ({ sharpener: 0, smite: 0, kingBasics: 0 })
export type DamageEffect = 'sharpener' | 'pierce' | 'splash' | 'burn' | 'bleed' | 'concussion' | 'severance' | 'smite'
export type EmitImpact = (event: Omit<CombatEvent, 'id' | 'seen'>) => void
export const enemyRank = (enemy: Enemy) => enemy.boss ? 'boss' : enemy.elite ? 'elite' : 'normal'

// Consume one action budget, rather than multiplying Smite by target or hit count.
export function smiteBudget(passives: PassiveState, turn: number) {
  if (passives.smiteTurn !== turn) {
    passives.smite = Math.min(balance.smiteCap, passives.smite + balance.smiteGain)
    passives.smiteTurn = turn; passives.smiteSpent = 0
  }
  const available = Math.max(0, passives.smite - (passives.smiteSpent ?? 0))
  passives.smiteSpent = passives.smite
  return available
}
export function splitBonus(bonus: number, count: number, index: number) {
  return count ? Math.floor(bonus / count) + (index < bonus % count ? 1 : 0) : 0
}
export function emitDamage(enemy: Enemy, components: number[], emit: EmitImpact, options: {
  effect?: DamageEffect; followup?: boolean; penetration?: number; direct?: boolean
} = {}) {
  const impacts = damageAttack(enemy, components, options)
  impacts.forEach((impact, index) => emit({ kind: 'hit', actor: 'pawn', targetId: enemy.id, cell: enemy.cell,
    amount: impact.damage, blocked: impact.blocked, penetrated: impact.penetrated,
    effect: index > 0 ? 'sharpener' : options.effect,
    delayMs: options.followup ? index > 0 ? balance.followupMs : balance.mainHitMs : 0 }))
  if (enemy.hp === 0 && impacts.length) emit({ kind: 'defeat', actor: enemy.id, cell: enemy.cell })
}
export function applyConcussion(enemy: Enemy) {
  if (enemy.hp > 0 && enemy.concussion === undefined && (enemy.stunImmunity ?? 0) === 0)
    enemy.concussion = balance.concussionDelay[enemyRank(enemy)]
}
export function applyBurn(enemy: Enemy, turn: number) {
  if (enemy.hp > 0) enemy.burn = { turnsLeft: balance.burnTurns, appliedTurn: turn }
}
export function applyBleed(enemy: Enemy, turn: number) {
  if (enemy.hp > 0 && (enemy.bleed?.length ?? 0) < balance.bleedCap)
    enemy.bleed = [...(enemy.bleed ?? []), { turnsLeft: balance.bleedTurns, appliedTurn: turn }]
}
export function afterBasic(state: GameState, enemy: Enemy, emit: EmitImpact) {
  const form = state.transformations.active?.form ?? 'pawn'
  if (form === 'pawn') state.passives.sharpener = Math.min(balance.sharpenerCap, state.passives.sharpener + 1)
  if (form === 'bishop') {
    const secondary = state.enemies.filter((other) => other.id !== enemy.id && other.hp > 0
      && state.visible.has(cellId(other.cell)) && isAdjacent(enemy.cell, other.cell)
      && state.dungeon.tiles.some((tile) => cellId(tile) === cellId(other.cell) && !tile.blocksMovement)
      && !state.occupied.some((cell) => cellId(cell) === cellId(other.cell))
      && hasLineOfSight(state.dungeon, enemy.cell, other.cell)
      && (enemy.cell.column === other.cell.column || enemy.cell.row === other.cell.row
        || [ { column: enemy.cell.column, row: other.cell.row }, { column: other.cell.column, row: enemy.cell.row } ]
          .every((cell) => state.dungeon.tiles.some((tile) => cellId(tile) === cellId(cell) && !tile.blocksMovement)))).sort((a, b) => a.id.localeCompare(b.id))
    for (const other of secondary.slice(0, balance.splashTargets)) emitDamage(other, [balance.splashDamage], emit, { effect: 'splash' })
    if (checkerIndex(state.cell.column, state.cell.row) !== checkerIndex(enemy.cell.column, enemy.cell.row)) applyBurn(enemy, state.turn)
  } else if (form === 'rook') applyConcussion(enemy)
  else if (form === 'queen') applyBleed(enemy, state.turn)
  else if (form === 'king') {
    state.passives.kingBasics++
    if (state.passives.kingBasics % balance.kingPushEvery === 0) pushEnemy(state, enemy, state.cell)
  }
}
export function pushEnemy(state: GameState, enemy: Enemy, origin: Cell) {
  if (enemy.hp <= 0 || enemy.boss || enemy.uninterruptible) return
  const destination = { column: enemy.cell.column + Math.sign(enemy.cell.column - origin.column),
    row: enemy.cell.row + Math.sign(enemy.cell.row - origin.row) }
  const board = { size: 8, available: state.dungeon.tiles, blocked: state.dungeon.tiles.filter((tile) => tile.blocksMovement),
    occupied: [state.cell, ...state.occupied, ...state.enemies.filter((other) => other.hp > 0 && other.id !== enemy.id).map((other) => other.cell)] }
  if (canOccupy(destination, board)) { enemy.from = enemy.cell; enemy.cell = destination; enemy.attackTarget = undefined; enemy.intent = 'idle' }
}

// Called once at each living enemy's response boundary. New DoTs skip their application
// turn; each independent Bleed expires after its own third subsequent tick.
export function tickEnemyStatuses(enemy: Enemy, turn: number, emit: EmitImpact) {
  if (enemy.hp <= 0) { clearDeadStatuses(enemy); return }
  if (enemy.burn && turn > enemy.burn.appliedTurn) {
    emitDamage(enemy, [balance.burnDamage], emit, { effect: 'burn', direct: false })
    if (enemy.burn && --enemy.burn.turnsLeft === 0) enemy.burn = undefined
  }
  if (enemy.hp > 0 && enemy.bleed) {
    const due = enemy.bleed.filter((stack) => turn > stack.appliedTurn)
    if (due.length) emitDamage(enemy, [due.length * balance.bleedDamage], emit, { effect: 'bleed', direct: false })
    if (enemy.bleed) enemy.bleed = enemy.bleed.map((stack) => ({ ...stack,
      turnsLeft: stack.turnsLeft - (turn > stack.appliedTurn ? 1 : 0) })).filter((stack) => stack.turnsLeft > 0)
  }
}
export function skipConcussedResponse(enemy: Enemy) {
  enemy.stunned = false
  if ((enemy.stunImmunity ?? 0) > 0) enemy.stunImmunity = (enemy.stunImmunity ?? 0) - 1
  if (enemy.uninterruptible) return false
  if (enemy.concussion === undefined) return false
  if (enemy.concussion > 0) { enemy.concussion--; return false }
  enemy.concussion = undefined; enemy.stunned = true
  enemy.stunImmunity = balance.stunImmunity[enemyRank(enemy)]
  enemy.attackTarget = undefined; enemy.intent = 'idle'
  return true
}
