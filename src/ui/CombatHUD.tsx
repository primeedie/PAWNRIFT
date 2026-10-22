import { attackTargets, enemyIntentLabel, foresightIntent, type CombatEvent } from '../game/logic/combat'
import { visibleEnemies } from '../game/logic/combatIndicators'
import { enemyName, enemyStatuses } from './enemyPresentation'
import { closeHudPanels } from './hudInteraction'
import { usePawnStore } from '../game/state/pawnStore'

function describeEvent(event: CombatEvent) {
  switch (event.kind) {
    case 'hit': return event.actor === 'pawn' ? `${event.effect === 'sharpener' ? 'Sharpener follow-up' : event.effect ?? 'Strike'} · ${event.amount} damage` : event.amount ? `−${event.amount} HP` : 'Guarded'
    case 'transform': return 'Transformation activated'
    case 'revert': return 'Returned to Pawn · recovery begins'
    case 'reveal': return 'Astral Eye reveals terrain and occupants'
    case 'parry': return 'Crimson Reversal · strike negated'
    case 'fear': return 'Frightened foe hesitates'
    case 'counter': return `Counter · ${event.amount} damage`
    case 'guard': return 'Guard ready'
    case 'heal': return `Restored ${event.amount} HP`
    case 'focus': return 'Focus gained'
    case 'windup': return event.actor === 'pawn' ? 'Royal Decree winding up' : event.actor.startsWith('dummy-') ? 'Dummy readies a strike' : 'Rookling readies a strike'
    case 'stun': return 'Concussion: response skipped'
    case 'miss': return event.actor.startsWith('dummy-') ? 'Dummy misses' : 'Rookling misses'
    case 'defeat': return event.actor === 'pawn' ? 'Defeated' : event.actor.startsWith('dummy-') ? 'Dummy defeated' : 'Rookling defeated'
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
  const locked = state.phase !== 'ready' || state.status !== 'playing'
  const feedback = state.events.filter((event) => event.seen).map(describeEvent).filter(Boolean).slice(-3).join(' · ')
  return (
    <div className="combat-hud">
      <div className="combat-actions" aria-label="Combat actions">
        <button disabled={locked || attackTargets(state).length === 0} onClick={() => state.tryAttack()} title="Attack one eligible enemy (E); directions depend on current form"><kbd>E</kbd><span>– Attack</span></button>
        <button disabled={locked} onClick={() => state.submitAction({ kind: 'defend' })} title="Guard and counter this turn (Q)"><kbd>Q</kbd><span>– Defend</span></button>
        <button disabled={locked} onClick={() => state.submitAction({ kind: 'wait' })} title="Wait one turn (Space or period)"><kbd>Space</kbd><span>– Wait</span></button>
        {state.status === 'victory' && <button onClick={() => state.regenerateFloor()}>Restart floor</button>}
        <details className="enemy-inspection" name="hud-panels"><summary>Inspect foes</summary>
          <div className="hud-panel" data-tooltip-avoid onKeyDown={(event) => { event.stopPropagation(); if(event.key==='Escape')closeHudPanels() }}>
            <button onClick={closeHudPanels}>Close inspection</button>
            {!visibleEnemies(state).length && <p>No foes currently in sight.</p>}
            {visibleEnemies(state).map((enemy) => <section key={enemy.id}>
              <strong>{enemyName(enemy)} {enemy.hp}/{enemy.maxHp}</strong>
              <p>{enemy.boss?'Boss':enemy.elite?'Elite':'Normal'} · Defense {enemy.defense ?? 0} · Block {enemy.block ?? 0}</p>
              <p>{enemyIntentLabel(enemy)}{foresightIntent(state,enemy.id) ? ` · Next: ${foresightIntent(state,enemy.id)}` : ''}</p>
              <ul>{enemyStatuses(enemy).map((status) => <li key={status.label}>{status.icon} {status.label}</li>)}</ul>
            </section>)}
          </div>
        </details>
      </div>
      <p className="combat-feedback" role="status" aria-live="polite" key={`${state.actionId}:${state.phase}`}>
        {state.status === 'defeat' ? 'Defeated' : state.status === 'victory' ? 'Floor cleared' : feedback}
      </p>
    </div>
  )
}
