import { useState } from 'react'
import { bossForms, formNames, type Attunement, type BossForm } from '../data/forms'
import { usePawnStore } from '../game/state/pawnStore'
import { activationReason, currentForm } from '../game/logic/transformations'
import { closeHudPanels } from './hudInteraction'

export default function TransformationTools() {
  const state = usePawnStore()
  const [form, setForm] = useState<BossForm>('knight')
  const [attunement, setAttunement] = useState<Attunement>('light')
  const [replacement, setReplacement] = useState<BossForm | ''>('')
  const [duration, setDuration] = useState(2)
  const [message, setMessage] = useState('')
  const blocked = !state.runActive ? 'Start or resume a run first.' : state.phase !== 'ready' ? 'Wait for the current action to finish.'
    : state.status !== 'playing' ? 'Reset the encounter or start a run first.' : undefined
  const unavailable = blocked ?? activationReason(state.transformations, form, attunement)
  const grant = () => {
    if (state.debugGrant(form, attunement)) setMessage(`${formNames[form]} ${attunement} granted/unlocked. Activate below; existing charges preserved.`)
    else setMessage(blocked ?? (state.transformations.inventory.length >= 2
      ? 'Both slots are full. Explicitly choose a replacement below.' : 'Reconstruction required; use boss-win simulation or an explicit test replacement.'))
  }
  const override = (action: Parameters<typeof state.playtest>[0]) => setMessage(state.playtest(action) ? 'Test override applied. No world turn spent.' : 'Unavailable: check active form, slot, or safe landing.')
  return <fieldset className="transformation-dev-tools"><legend>Transformation testing</legend>
    <p>Explicit overrides mark this as a test session. King is available in Training Grounds only.</p>
    <label>Form<select value={form} onChange={(event) => setForm(event.target.value as BossForm)}>
      {bossForms.map((id) => <option key={id} value={id}>{formNames[id]}</option>)}
    </select></label>
    <label>Attunement<select value={attunement} onChange={(event) => setAttunement(event.target.value as Attunement)}>
      <option value="light">Light</option><option value="dark">Dark</option>
    </select></label>
    <button type="button" disabled={!!blocked} onClick={grant}>Grant / unlock attunement</button>
    <button type="button" disabled={!!unavailable} onClick={() => {
      if (state.submitAction({ kind: 'transform', form, attunement })) { setMessage('Activation accepted.'); closeHudPanels() }
      else setMessage('Activation unavailable; finish the current action.')
    }}>Test activation</button>
    {unavailable && <p>{unavailable === 'Transformation not carried.' ? 'Grant this form first, then activate it.' : unavailable}</p>}
    {state.transformations.recovery > 0 && <p>Use Simulate completed floor until Recovery is 0, or explicitly clear it below for testing.</p>}
    <label>Replace carried slot (explicit test)<select value={replacement} onChange={(event) => setReplacement(event.target.value as BossForm | '')}>
      <option value="">Choose a slot</option>{state.transformations.inventory.map((item) => <option key={item.form} value={item.form}>{formNames[item.form]} - {item.charges}/5</option>)}
    </select></label>
    <button type="button" disabled={!!blocked || !replacement || replacement === form || state.transformations.active?.form === replacement}
      onClick={() => { if (replacement) override({ kind: 'replace', form, attunement, replace: replacement }) }}>Replace selected slot with {formNames[form]} (test)</button>
    {replacement && state.transformations.active?.form === replacement && <p>Return to Pawn before replacing the active slot.</p>}
    <button type="button" disabled={!!blocked} onClick={() => override({ kind: 'charges', form })}>Restore {formNames[form]} charges (test)</button>
    <label>Remaining active floors<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label>
    <button type="button" disabled={!!blocked || !state.transformations.active} onClick={() => override({ kind: 'duration', floors: duration })}>Set duration (test)</button>
    <button type="button" disabled={!!blocked} onClick={() => override({ kind: 'recovery' })}>Clear recovery (test)</button>
    <button type="button" disabled={!!blocked || !state.transformations.active} onClick={() => override({ kind: 'revert' })}>Return to Pawn (test)</button>
    <button type="button" disabled={!!blocked} onClick={() => override({ kind: 'cooldown', form })}>Reset {formNames[form]} cooldown (test)</button>
    <button type="button" disabled={!!blocked} onClick={() => override({ kind: 'eye' })}>Reset Astral Eye use (test)</button>
    <button type="button" disabled={!!blocked || form === 'king'} onClick={() => state.debugBossWin(form, attunement)}>Simulate corresponding boss win</button>
    {form === 'king' && <button type="button" disabled={!!blocked || state.transformations.active?.form === 'king'} onClick={() => override({ kind: 'king-availability' })}>Restore King test eligibility (test)</button>}
    <button type="button" disabled={!!blocked} onClick={state.debugDefeat}>Test death retention</button>
    <details><summary>Transformation state</summary><dl className="diagnostic-values">
      <dt>Session</dt><dd>{state.playtestMode ? 'Playtest overrides used' : 'Normal rules'}</dd>
      <dt>Form</dt><dd>{formNames[currentForm(state.transformations)]} {state.transformations.active?.attunement}</dd>
      <dt>Floor / duration</dt><dd>{state.floorNumber} / {state.transformations.active?.floorsLeft ?? 0}</dd>
      <dt>Recovery</dt><dd>{state.transformations.recovery}{state.transformations.recoveryStartsNextFloor ? ' (full next floor)' : ''}</dd>
      {state.transformations.inventory.map((item) => <div key={item.form}><dt>{formNames[item.form]}</dt><dd>{item.charges}/5 - {item.attunements.join('/')}</dd></div>)}
      <dt>Cooldowns</dt><dd>{Object.entries(state.signatures.cooldowns).map(([name, value]) => `${name} ${value}`).join(', ')}</dd>
      <dt>Astral Eye</dt><dd>{state.signatures.eyeUsed ? 'Used this floor' : 'Available'}</dd>
      <dt>Reconstruction</dt><dd>{Object.entries(state.transformations.reconstruction).map(([name,value]) => `${name}: ${value}`).join(', ') || 'None'}</dd>
      <dt>Turn / phase</dt><dd>{state.turn} / {state.phase}</dd>
    </dl></details>
    <p role="status">{message}</p>
  </fieldset>
}
