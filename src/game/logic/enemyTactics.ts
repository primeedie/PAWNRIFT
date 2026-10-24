import { enemies, BALANCE_PENDING_USER_DOCUMENT as fixture, patternNames, type EnemyId, type AttackPattern } from '../../data/enemies'
import type { Attunement } from '../../data/forms'
import type { Enemy, GameState, CombatEvent } from './combat'
import { cellId, neighborIds, cellFromId } from './dungeon'
import { gridDistance, hasLineOfSight, nextPathStep } from './enemyAI'
import { sameCell, canOccupy, type Cell } from './movement'
import { grantBlock, tickBlock, blockTotal } from './protection'
import type { IncomingAttack } from './playerDefense'

export type EnemyPlan = { pattern: AttackPattern; origin: Cell; cells: Cell[]; path: Cell[]; target: Cell }
export type EnemyTactics = { phase: 0 | 1; step: number; recovery: number; pending?: EnemyPlan;
  observed?: boolean; passive?: boolean; paused?: boolean; lastPattern?:AttackPattern }
export const isRosterEnemy = (enemy: Enemy): enemy is Enemy & { kind: EnemyId; tactics: EnemyTactics } => Object.hasOwn(enemies, enemy.kind) && !!enemy.tactics
export function createEnemy(kind: EnemyId, id: string, cell: Cell, variant: Attunement): Enemy {
  const definition = enemies[kind]
  return { id, kind, variant: definition.variant ?? variant, cell: { ...cell }, from: { ...cell }, hp: definition.stats.hp,
    maxHp: definition.stats.hp, defense: definition.stats.defense, boss: definition.rank === 'boss', elite: definition.rank === 'elite',
    intent: 'idle', searchLeft: 0, tactics: { phase: 0, step: 0, recovery: 0 }, block: 0, blockSources: [] }
}
const occupied = (state: GameState, enemy: Enemy) => [...state.occupied,
  ...state.enemies.filter(other => other.id !== enemy.id && other.hp > 0).map(other => other.cell)]
const board = (state: GameState, enemy: Enemy) => ({ size: 8, available: state.dungeon.tiles,
  blocked: state.dungeon.tiles.filter(tile => tile.blocksMovement), occupied: occupied(state, enemy) })

// One geometry source for committed warnings and actual hits. Occupants stop lanes.
export function planEnemyAttack(state: GameState, enemy: Enemy, pattern: AttackPattern): EnemyPlan | undefined {
  const origin = { ...enemy.cell }, target = { ...state.cell }, dx = target.column - origin.column, dy = target.row - origin.row
  const plan: EnemyPlan = { pattern, origin, target, cells: [], path: [] }
  if (pattern === 'command' || pattern === 'fractured-guard') return plan
  if (!hasLineOfSight(state.dungeon, origin, target)) return
  if (pattern === 'twin-strike') {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) return
    plan.cells = [target]; return plan
  }
  if (dx !== 0 && dy !== 0) return
  if (gridDistance(origin, target) < 1 || gridDistance(origin, target) > fixture.attacks[pattern].range) return
  const sx = Math.sign(dx), sy = Math.sign(dy)
  for (let n = 1; n <= fixture.attacks[pattern].range; n++) {
    const cell = { column: origin.column + sx * n, row: origin.row + sy * n }
    if (!canOccupy(cell, board(state, enemy)) || !hasLineOfSight(state.dungeon, origin, cell)) break
    plan.cells.push(cell)
    if (pattern === 'charge' || pattern === 'lunge') {
      if (sameCell(cell, target)) break
      plan.path.push(cell)
    }
    if (pattern === 'shot') { if (sameCell(cell, target)) break }
  }
  return plan.cells.some(cell => sameCell(cell, target)) ? plan : undefined
}
export function currentThreat(state: GameState, enemy: Enemy): Cell[] {
  const plan = enemy.tactics?.pending
  if (!plan || enemy.hp <= 0 || !sameCell(plan.origin, enemy.cell)) return []
  const valid: Cell[] = []
  for (const cell of plan.cells) {
    if (!canOccupy(cell, board(state, enemy)) || !hasLineOfSight(state.dungeon, plan.origin, cell)) break
    valid.push(cell)
  }
  return valid
}
export function enemyPlanLabel(enemy: Enemy) {
  const t = enemy.tactics
  if (!t) return undefined
  if(t.pending&&['command','fractured-guard'].includes(t.pending.pattern))return `${patternNames[t.pending.pattern]} · finite Block next response; recovery follows`
  return t.paused ? 'Behavior paused (test)' : t.passive ? 'Passive target (test)' : t.pending
    ? `${patternNames[t.pending.pattern]} · next response · ${fixture.attacks[t.pending.pattern].kind}; guard/parry applies`
    : t.recovery ? 'Recovering · opening' : (enemy.block ?? 0) > 0 ? 'Finite guarded stance' : undefined
}

// Called once by the normal response loop, on its owned clone. Never from a frame.
export function respondRosterEnemy(state: GameState, enemy: Enemy,
  emit: (event: Omit<CombatEvent, 'id' | 'seen'>) => void, receive: (enemy: Enemy, attack: IncomingAttack) => void) {
  if (!isRosterEnemy(enemy)) return
  const t = enemy.tactics, definition = enemies[enemy.kind]
  const seen = state.visible.has(cellId(enemy.cell))
  const wasObserved = t.observed === true
  t.observed = seen
  if (t.passive || t.paused) { emit({ kind: 'wait', actor: enemy.id, cell: enemy.cell }); return }
  if (t.pending) {
    const plan = t.pending, cells = currentThreat(state, enemy)
    t.lastPattern=plan.pattern
    t.pending = undefined; enemy.attackTarget = undefined; enemy.intent = 'idle'
    // Never resolve a surprise attack on first sight; never re-aim a committed plan.
    if (!seen || !wasObserved || !sameCell(plan.origin, enemy.cell)) {
      emit({ kind: 'miss', actor: enemy.id, cell: enemy.cell }); t.recovery = fixture.attacks[plan.pattern].recovery; return
    }
    if (plan.pattern === 'command' || plan.pattern === 'fractured-guard') {
      enemy.blockSources = grantBlock(enemy.blockSources ?? [], { id: 'stance', name: patternNames[plan.pattern],
        amount: fixture.guard.amount, windowsLeft: fixture.guard.windows })
      enemy.block = blockTotal(enemy.blockSources)
      emit({ kind: 'guard', actor: enemy.id, cell: enemy.cell })
    } else {
      if (plan.pattern === 'charge' || plan.pattern === 'lunge') {
        for (const step of plan.path) {
          if (sameCell(step, state.cell) || !cells.some(cell => sameCell(cell, step))) break
          enemy.cell = { ...step }
        }
        if (!sameCell(enemy.cell, enemy.from)) emit({ kind: 'move', actor: enemy.id, cell: enemy.cell })
      }
      if (cells.some(cell => sameCell(cell, state.cell))) receive(enemy, { kind: fixture.attacks[plan.pattern].kind })
      else emit({ kind: 'miss', actor: enemy.id, cell: plan.target })
    }
    t.recovery = fixture.attacks[plan.pattern].recovery
    return
  }
  if (t.recovery > 0) { t.recovery--; emit({ kind: 'wait', actor: enemy.id, cell: enemy.cell }); return }
  const detects = gridDistance(enemy.cell, state.cell) <= definition.stats.detection && hasLineOfSight(state.dungeon, enemy.cell, state.cell)
  if (detects) { enemy.lastSeen = { ...state.cell }; enemy.searchLeft = definition.stats.search }
  if(detects&&seen&&definition.role==='ranged'&&gridDistance(enemy.cell,state.cell)===1&&enemy.intent!=='pursue'){
    const retreat=neighborIds(cellId(enemy.cell)).map(cellFromId).filter(cell=>!sameCell(cell,state.cell)&&canOccupy(cell,board(state,enemy))
      &&gridDistance(cell,state.cell)>1&&hasLineOfSight(state.dungeon,cell,state.cell)).sort((a,b)=>cellId(a)-cellId(b))[0]
    if(retreat){enemy.cell=retreat;enemy.intent='pursue';emit({kind:'move',actor:enemy.id,cell:retreat});return}
  }
  if (detects && seen) {
    const patterns = definition.phases[t.phase]
    const preferred = patterns[t.step % patterns.length]
    let plan = planEnemyAttack(state, enemy, preferred)
    // Out-of-range commanders still have close defense; charge remains lane-bound.
    if (!plan) plan = patterns.map(pattern => planEnemyAttack(state, enemy, pattern)).find(p => p && p.cells.length > 0)
    if (plan) {
      t.pending = plan; t.step++; enemy.intent = 'attack'; enemy.attackTarget = plan.target
      emit({ kind: 'windup', actor: enemy.id, cell: enemy.cell }); return
    }
  }
  if (!enemy.lastSeen) { enemy.intent = 'idle'; return }
  // Ranged/reach soldiers seek clear firing lanes and preserve spacing. Stable ties.
  const options = neighborIds(cellId(enemy.cell)).map(cellFromId).filter(cell => !sameCell(cell, state.cell) && canOccupy(cell, board(state, enemy)))
  let step: Cell | undefined
  if (detects && (definition.role === 'ranged' || definition.role === 'reach')) {
    step = options.map(cell => ({ cell, shot: planEnemyAttack({ ...state }, { ...enemy, cell }, definition.patterns[0]),
      distance: gridDistance(cell, state.cell) })).sort((a,b) => Number(!!b.shot) - Number(!!a.shot)
        || Math.abs(a.distance - fixture.attacks[definition.patterns[0]].range) - Math.abs(b.distance - fixture.attacks[definition.patterns[0]].range)
        || cellId(a.cell) - cellId(b.cell))[0]?.cell
  }
  step ??= nextPathStep(state.dungeon, enemy.cell, enemy.lastSeen, [...occupied(state, enemy)])
  if (step && !sameCell(step, state.cell)) {
    enemy.cell = { ...step }; enemy.intent = detects ? 'pursue' : 'search'; emit({ kind: 'move', actor: enemy.id, cell: step })
  } else if (!detects && --enemy.searchLeft <= 0) { enemy.lastSeen = undefined; enemy.intent = 'idle' }
}
export function tickEnemyBlock(enemy: Enemy) {
  if (!enemy.blockSources) return
  enemy.blockSources = tickBlock(enemy.blockSources); enemy.block = blockTotal(enemy.blockSources)
}
