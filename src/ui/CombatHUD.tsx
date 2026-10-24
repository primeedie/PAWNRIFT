import { attackTargets, type CombatEvent, type Enemy } from '../game/logic/combat'
import { visibleEnemies } from '../game/logic/combatIndicators'
import { enemyName } from './enemyPresentation'
import { aimBasicAttack, inspectedEnemy, useInspectionStore } from './inspectionStore'
import { closeHudPanels } from './hudInteraction'
import { usePawnStore } from '../game/state/pawnStore'
import { blockWindowLabel } from '../game/logic/protection'
import { eligibleInteractions } from '../game/logic/interactions'

function describeEvent(event: CombatEvent, enemies:Enemy[]) {
  const actor=enemies.find(enemy=>enemy.id===event.actor),name=actor?enemyName(actor):'Enemy'
  switch (event.kind) {
    case 'chest':return 'Chest opened'
    case 'hit': return event.actor === 'pawn' ? `${event.effect === 'sharpener' ? 'Sharpener follow-up' : event.effect ?? 'Strike'} · ${event.amount} damage` : event.amount ? `−${event.amount} HP` : 'Guarded'
    case 'transform': return 'Transformation activated'
    case 'revert': return 'Returned to Pawn · recovery begins'
    case 'reveal': return 'Astral Eye reveals terrain and occupants'
    case 'parry': return event.parryKind==='samurai'?`Samurai Mode · strike negated · ${event.parriesLeft}/3`:'Parried · strike negated'
    case 'fear': return 'Frightened foe hesitates'
    case 'counter': return `Counter · ${event.amount} damage`
    case 'guard': return 'Guard ready'
    case 'heal': return `Restored ${event.amount} HP`
    case 'focus': return 'Focus gained'
    case 'windup': return event.actor === 'pawn' ? 'Royal Decree winding up' : `${name} prepares · amber warnings resolve next response`
    case 'stun': return 'Concussion: response skipped'
    case 'miss': return `${name} misses`
    case 'phase': return `${name} changes stance · recovery opening`
    case 'defeat': return event.actor === 'pawn' ? 'Defeated' : `${name} defeated`
    case 'victory': return 'Floor cleared'
    default: return ''
  }
}

export function CombatStatus() {
  const { hp, maxHp, turn, phase } = usePawnStore()
  return (
    <div className="combat-status" aria-label={`Player health ${hp} of ${maxHp}. Turn ${turn}.`}>
      <span className={`player-health ${hp <= maxHp / 3 ? 'low-health' : ''}`}>
        <span>HP {hp}/{maxHp}</span>
        <span className="health-track" role="progressbar" aria-label="Pawn health" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
          <span style={{ width: `${100 * hp / maxHp}%` }} />
        </span>
      </span>
      <span>TURN {turn}</span>
      <span className="turn-indicator" aria-label={phase === 'ready' ? 'Awaiting your action' : 'Resolving action'} data-busy={phase !== 'ready'} />
    </div>
  )
}

export function CombatHUD() {
  const state = usePawnStore()
  const inspection=useInspectionStore()
  const locked = state.phase !== 'ready' || state.status !== 'playing'
  const feedback = state.events.filter((event) => event.seen).map(event=>describeEvent(event,state.enemies)).filter(Boolean).slice(-3).join(' · ')
  const context=!(state.selectedCardId||state.selectedAbility||inspection.aimingAttack)&&eligibleInteractions(state).length>0
  return (
    <div className="combat-hud">
      <div className="combat-actions" aria-label="Combat actions">
        {state.block>0&&<span className="protection-status">Block <strong>{state.block}</strong> · {blockWindowLabel(state)}</span>}
        {state.fortified&&<span className="protection-status">Fortified · {state.fortified.windowsLeft} retaliation response{state.fortified.windowsLeft===1?'':'s'}</span>}
        <button disabled={locked || attackTargets(state).length === 0} onClick={() => state.tryAttack()} title="Explicit basic Attack; directions depend on current form">{!context&&<kbd>E</kbd>}<span>– Attack</span></button>
        <button disabled={locked || attackTargets(state).length===0} aria-pressed={inspection.aimingAttack} onClick={()=>{closeHudPanels();aimBasicAttack()}}>Choose target</button>
        {inspection.aimingAttack && <button onClick={()=>useInspectionStore.setState({aimingAttack:false})}>Cancel attack</button>}
        <button disabled={locked} onClick={() => state.submitAction({ kind: 'defend' })} title="Guard and counter this turn (Q)"><kbd>Q</kbd><span>– Defend</span></button>
        <button disabled={locked} onClick={() => state.submitAction({ kind: 'wait' })} title="Wait one turn (Space or period)"><kbd>Space</kbd><span>– Wait</span></button>
        {state.status === 'victory' && !state.floorContent && <button onClick={() => state.regenerateFloor()}>Restart floor</button>}
        <select className="inspect-foe-select" aria-label="Inspect visible enemy" aria-controls="enemy-information" data-inspection-root value={inspection.enemyId ?? ''}
          disabled={!visibleEnemies(state).length || !!state.selectedCardId || state.selectedAbility || inspection.aimingAttack}
          onChange={event=>{if(inspectedEnemy(usePawnStore.getState(),event.target.value))inspection.toggleEnemy(event.target.value);else inspection.closeEnemy()}}>
          <option value="">Inspect foe…</option>{visibleEnemies(state).map((enemy,index)=><option key={enemy.id} value={enemy.id}>{enemyName(enemy)} {index+1}</option>)}
        </select>
      </div>
      <p className="combat-feedback" role="status" aria-live="polite" key={`${state.actionId}:${state.phase}`}>
        {state.status === 'defeat' ? 'Defeated' : state.progress?.finished?'Development route ended · boss encounters remain unimplemented.':state.status === 'victory' ? 'Floor cleared' : inspection.aimingAttack ? 'Choose one highlighted foe · Escape cancels' : feedback}
      </p>
    </div>
  )
}
