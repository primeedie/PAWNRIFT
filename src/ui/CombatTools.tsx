import { useState } from 'react'
import { testForms, formNames, type ChessForm } from '../data/forms'
import { usePawnStore } from '../game/state/pawnStore'
import { PassiveTools } from './PassiveTools'
import type { PlaytestAction } from '../game/logic/playtesting'
import { EnemyTools } from './EnemyTools'
export function CombatTools() {
  const state = usePawnStore(), [form, setForm] = useState<ChessForm>('pawn'), [message, setMessage] = useState('')
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  const run = (action: PlaytestAction) => setMessage(state.playtest(action) ? 'Test override applied; no turn spent.' : 'No valid visible placement or action unavailable.')
  return <fieldset className="transformation-dev-tools"><legend>Combat testing</legend>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'spawn' })}>Spawn visible test enemy</button>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'clear-enemies' })}>Clear enemies</button>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'hp' })}>Restore HP</button>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'energy' })}>Restore Energy</button>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'focus' })}>Restore Focus</button>
    <label>Ability<select value={form} onChange={(event) => setForm(event.target.value as ChessForm)}>
      {(['pawn', ...testForms] as const).map((id) => <option key={id} value={id}>{formNames[id]}</option>)}
    </select></label>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'cooldown', form })}>Reset selected cooldown</button>
    <button type="button" disabled={locked} onClick={() => run({ kind: 'cooldown' })}>Reset all cooldowns</button>
    <p>Turn {state.turn} - {state.phase}. Test enemies spawn only on valid visible cells.</p>
    <PassiveTools />
    <EnemyTools />
    <p role="status">{message}</p>
  </fieldset>
}
