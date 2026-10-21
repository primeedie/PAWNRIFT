import { useState } from 'react'
import { bossForms, formNames, type Attunement, type BossForm } from '../../data/forms'
import { usePawnStore } from '../../game/state/pawnStore'
import { newRunSeed } from '../../utils/newRunSeed'

export default function TransformationDevTools() {
  const state = usePawnStore()
  const [form, setForm] = useState<BossForm>('knight')
  const [attunement, setAttunement] = useState<Attunement>('light')
  const [message, setMessage] = useState('')
  return <fieldset className="transformation-dev-tools"><legend>Transformation testing · development</legend>
    <label>Form<select value={form} onChange={(event) => setForm(event.target.value as BossForm)}>
      {bossForms.map((id) => <option key={id} value={id}>{formNames[id]}</option>)}
    </select></label>
    <label>Attunement<select value={attunement} onChange={(event) => setAttunement(event.target.value as Attunement)}>
      <option value="light">Light</option><option value="dark">Dark</option>
    </select></label>
    <button type="button" onClick={() => setMessage(state.debugGrant(form, attunement)
      ? 'Granted/unlocked; existing charges preserved.' : 'Slots full, reconstruction required, or action busy.')}>Grant / unlock attunement</button>
    <button type="button" onClick={() => setMessage(state.submitAction({ kind: 'transform', form, attunement })
      ? 'Activation accepted: finish enemy response.' : 'Activation unavailable; inspect the normal form HUD.')}>Test activation</button>
    <button type="button" onClick={() => setMessage(state.transitionFloor(newRunSeed(state.dungeon.seed), true)
      ? 'Completed one floor.' : 'Wait for the action to finish.')}>Simulate completed floor</button>
    <button type="button" onClick={() => state.debugBossWin(form, attunement)}>Simulate corresponding boss win</button>
    <button type="button" onClick={state.debugDefeat}>Test death retention</button>
    <p>Floor {state.floorNumber} · Recovery {state.transformations.recovery}</p>
    {state.transformations.inventory.map((item) => <p key={item.form}>{formNames[item.form]}: {item.charges}/5 · {item.attunements.join('/')}</p>)}
    <p>Reconstruction: {JSON.stringify(state.transformations.reconstruction)}</p>
    <p role="status">{message}</p>
  </fieldset>
}
