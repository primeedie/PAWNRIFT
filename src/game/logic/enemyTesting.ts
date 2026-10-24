import { enemies, enemyIds, BALANCE_PENDING_USER_DOCUMENT as fixture, type EnemyId, type AttackPattern } from '../../data/enemies'
import type { Attunement } from '../../data/forms'
import type { GameState } from './combat'
import { createEnemy, isRosterEnemy, planEnemyAttack } from './enemyTactics'
import { cellId } from './dungeon'
import { canOccupy, sameCell } from './movement'
import { cloneEnemy } from './damage'
import { applyBleed, applyBurn, applyConcussion } from './passives'

export type EnemyTestCommand = { kind: 'spawn'; archetype: EnemyId; variant: Attunement; passive: boolean }
  | { kind: 'clear' }
  | { kind: 'reset' | 'phase' | 'pattern' | 'passive' | 'pause' | 'status'; id: string;
    phase?: 0 | 1; pattern?: AttackPattern; value?: boolean; status?: 'burn' | 'bleed' | 'concussion' | 'fear' | 'exposed' | 'clear' }

// Public testing, never a player command. Visibility guards apply even in debug mode.
export function enemyTestControl(state: GameState, command: EnemyTestCommand): GameState | null {
  if (state.hp <= 0 || state.status !== 'playing') return null
  if (command.kind === 'clear') return { ...state, enemies: [], events: [] }
  if (command.kind === 'spawn') {
    if (!enemyIds.includes(command.archetype) || !['light','dark'].includes(command.variant)) return null
    const cell = state.dungeon.tiles.filter(tile => state.visible.has(cellId(tile)) && !sameCell(tile,state.cell)
      && canOccupy(tile, {size:8,available:state.dungeon.tiles,blocked:state.dungeon.tiles.filter(t=>t.blocksMovement),
        occupied:[...state.occupied,...state.enemies.filter(e=>e.hp>0).map(e=>e.cell)]}))
      .sort((a,b)=>cellId(a)-cellId(b))[0]
    if (!cell) return null
    const actor = createEnemy(command.archetype, `test-${command.archetype}-${state.eventSerial}-${state.turn}-${cellId(cell)}`,cell,command.variant)
    actor.tactics!.passive=command.passive
    return {...state,events:[],enemies:[...state.enemies.filter(e=>e.id!==actor.id),actor]}
  }
  const target=state.enemies.find(e=>e.id===command.id&&state.visible.has(cellId(e.cell)))
  if(!target||!isRosterEnemy(target))return null
  const enemy=cloneEnemy(target),t=enemy.tactics!
  if(command.kind==='reset'){
    if(target.hp<=0&&(sameCell(target.cell,state.cell)||state.enemies.some(e=>e.id!==target.id&&e.hp>0&&sameCell(e.cell,target.cell))))return null
    const fresh=createEnemy(target.kind,target.id,target.cell,target.variant??'light')
    return {...state,events:[],enemies:state.enemies.map(e=>e.id===target.id?fresh:e)}
  }
  if(target.hp<=0)return null
  if(command.kind==='phase'){
    if(!target.boss||![0,1].includes(command.phase!))return null
    t.phase=command.phase!;t.step=0;t.pending=undefined;t.recovery=fixture.phaseRecovery;enemy.intent='idle';enemy.attackTarget=undefined
    enemy.block=0;enemy.blockSources=[]
  }else if(command.kind==='pattern'){
    if(!command.pattern||!enemies[target.kind].patterns.includes(command.pattern))return null
    const plan=planEnemyAttack(state,enemy,command.pattern)
    if(!plan)return null
    t.pending=plan;t.recovery=0;t.observed=true;enemy.intent='attack';enemy.attackTarget=plan.target
  }else if(command.kind==='passive'||command.kind==='pause'){
    if(command.kind==='passive')t.passive=!!command.value;else t.paused=!!command.value
    t.pending=undefined;enemy.attackTarget=undefined;enemy.intent='idle'
  }else if(command.kind==='status'){
    if(command.status==='burn')applyBurn(enemy,state.turn-1)
    else if(command.status==='bleed')applyBleed(enemy,state.turn-1)
    else if(command.status==='concussion')applyConcussion(enemy)
    else if(command.status==='fear')enemy.fearTurns=1
    else if(command.status==='exposed')enemy.exposedTurns=1
    else {enemy.burn=undefined;enemy.bleed=undefined;enemy.concussion=undefined;enemy.stunImmunity=0;enemy.fearTurns=0;enemy.exposedTurns=0}
  }
  return {...state,eventSerial:state.eventSerial+(command.kind==='phase'?1:0),
    events:command.kind==='phase'?[{id:state.eventSerial+1,kind:'phase',actor:enemy.id,cell:enemy.cell,seen:true}]:[],
    enemies:state.enemies.map(e=>e.id===target.id?enemy:e)}
}
