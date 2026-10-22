import { useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { visibleEnemies } from '../game/logic/combatIndicators'
import { passiveBalance } from '../data/passives'

export function PassiveTools() {
  const state = usePawnStore(), [target, setTarget] = useState('')
  const enemies = visibleEnemies(state), enemy = enemies.find((enemy) => enemy.id === target) ?? enemies[0]
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  return <details><summary>Passive and status testing</summary>
    <p>Sharpener {state.passives.sharpener}/5 · Smite +{state.passives.smite}/10. Sky Piercer: range 2, penetration {passiveBalance.penetration * 100}% of defense; Block remains.</p>
    <button disabled={locked} onClick={() => state.playtest({ kind: 'sharpener-reset' })}>Reset Sharpener</button>
    <button disabled={locked} onClick={() => state.playtest({ kind: 'passive-reset' })}>Reset passives and enemy statuses</button>
    <label>Visible enemy<select disabled={locked || !enemy} value={enemy?.id ?? ''} onChange={(event) => setTarget(event.target.value)}>
      {!enemies.length && <option value="">No visible enemies</option>}
      {enemies.map((entry) => <option key={entry.id} value={entry.id}>{entry.id}</option>)}
    </select></label>
    {(['burn', 'clear-burn', 'bleed', 'clear-bleed', 'concussion', 'clear-concussion', 'immunity', 'clear'] as const).map((effect) => <button key={effect} disabled={locked || !enemy}
      onClick={() => { if (enemy) state.playtest({ kind: 'status', targetId: enemy.id, effect }) }}>
      {effect === 'immunity' ? 'Clear stun immunity' : effect === 'clear' ? 'Clear selected statuses' : effect.startsWith('clear-') ? `Clear ${effect.slice(6)}` : `Apply ${effect}`}
    </button>)}
    {enemy && <p>Burn: {enemy.burn?.turnsLeft ?? 0}. Bleed lifetimes: {enemy.bleed?.map((stack) => stack.turnsLeft).join(', ') || 'none'}.
      {' '}Concussion: {enemy.concussion ?? 'none'}. Immunity: {enemy.stunImmunity ?? 0}.</p>}
    <button disabled={locked} onClick={() => state.submitAction({ kind: 'wait' })}>Advance one world turn</button>
    <button disabled={locked} onClick={() => state.regenerateFloor()}>Reset combat encounter</button>
    <p>Test-applied DoTs begin on the next accepted action. Normal/elite/boss stun timing uses the same rules; no new enemy classes are spawned.</p>
  </details>
}
