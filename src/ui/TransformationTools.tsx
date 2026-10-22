import { useState } from 'react'
import { bossForms, formNames, type Attunement, type BossForm } from '../data/forms'
import { usePawnStore } from '../game/state/pawnStore'
import { newRunSeed } from '../utils/newRunSeed'
import { activationReason } from '../game/logic/transformations'

export default function TransformationTools() {
  const state = usePawnStore()
  const [form, setForm] = useState<BossForm>('knight')
  const [attunement, setAttunement] = useState<Attunement>('light')
  const [message, setMessage] = useState('')
  const blocked = !state.runActive ? 'Start or resume a run first.' : state.phase !== 'ready' ? 'Wait for the current action to finish.'
    : state.status !== 'playing' ? 'Start a new run or simulate the next floor first.' : undefined
  const unavailable = blocked ?? activationReason(state.transformations, form, attunement)
  const grant = () => {
    if (state.debugGrant(form, attunement)) setMessage(`${formNames[form]} ${attunement} granted/unlocked. Activate below; existing charges preserved.`)
    else setMessage(blocked ?? (state.transformations.inventory.length >= 2
      ? `Both slots are full: ${state.transformations.inventory.map((item) => formNames[item.form]).join(', ')}.`
      : 'This item needs reconstruction. Use the corresponding boss-win simulation.'))
  }
  return <fieldset className="transformation-dev-tools"><legend>Transformation testing</legend>
    <p>Forms currently share the Pawn model; movement and signatures change.</p>
    <label>Form<select value={form} onChange={(event) => setForm(event.target.value as BossForm)}>
      {bossForms.map((id) => <option key={id} value={id}>{formNames[id]}</option>)}
    </select></label>
    <label>Attunement<select value={attunement} onChange={(event) => setAttunement(event.target.value as Attunement)}>
      <option value="light">Light</option><option value="dark">Dark</option>
    </select></label>
    <button type="button" disabled={!!blocked} onClick={grant}>Grant / unlock attunement</button>
    <button type="button" disabled={!!unavailable} onClick={(event) => {
      if (state.submitAction({ kind: 'transform', form, attunement })) {
        setMessage('Activation accepted.')
        const panel = event.currentTarget.closest('details'); if (panel) panel.open = false
      } else setMessage('Activation unavailable. Wait for the current action to finish.')
    }}>Test activation</button>
    {unavailable && <p>{unavailable === 'Transformation not carried.' ? 'Grant this form first, then activate it.' : unavailable}</p>}
    {state.transformations.recovery > 0 && <p>Use Simulate completed floor until Recovery is 0; reseeding does not complete recovery.</p>}
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
