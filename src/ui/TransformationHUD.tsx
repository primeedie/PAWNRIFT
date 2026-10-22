import { useState } from 'react'
import { formBalance, formNames, formSymbols, type Attunement, type BossForm } from '../data/forms'
import { signatureAbilities } from '../data/abilities'
import { activationReason, currentForm } from '../game/logic/transformations'
import { abilityReason } from '../game/logic/signatures'
import { reversionReason } from '../game/logic/perching'
import { usePawnStore } from '../game/state/pawnStore'
import { KeywordTooltip } from './KeywordTooltip'
import { MovementGuide } from './MovementGuide'
import { combatBalance } from '../data/combatBalance'

export function TransformationHUD() {
  const state = usePawnStore(), forms = state.transformations, form = currentForm(forms)
  const [candidate, setCandidate] = useState<{ form: BossForm; attunement: Attunement }>()
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  const item = forms.inventory.find((entry) => entry.form === forms.active?.form)
  const reason = candidate ? activationReason(forms, candidate.form, candidate.attunement) : undefined
  const unavailable = abilityReason(state), revertUnavailable = reversionReason(state)
  const active = forms.active, ability = signatureAbilities[form]
  const basicDamage = (form === 'pawn' ? combatBalance.playerDamage : formBalance[form].damage
    + (active?.attunement === 'light' ? formBalance.lightDamage : 0)) + state.focus
  const basicBlock = (form === 'rook' ? formBalance.rook.basicBlock : 0) + (active?.attunement === 'dark' ? formBalance.darkBlock : 0)
  const signatureHelp = state.focus && (form === 'knight' || form === 'queen')
    ? ability.summary.replace(/\.$/, ` (first hit also gains ${state.focus} Focus damage).`) : ability.summary
  const status = form === 'bishop' ? state.signatures.eyeUsed ? 'Used this floor' : 'Available'
    : state.signatures.cooldowns[form] ? `${state.signatures.cooldowns[form]} turns` : 'Ready'
  const closePanel = (button: HTMLButtonElement) => { const details = button.closest('details'); if (details) details.open = false }
  const openTesting = () => {
    document.querySelectorAll<HTMLDetailsElement>('details[name="hud-panels"]').forEach((panel) => { panel.open = false })
    const tools = document.querySelector<HTMLDetailsElement>('#dungeon-tools')
    if (tools) {
      tools.open = true
      tools.scrollTop = 0
      tools.querySelector('summary')?.focus()
    }
  }
  return <section className="transformation-hud" aria-label="Transformations" data-tooltip-avoid onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.currentTarget.querySelectorAll('details[open]').forEach((element) => { (element as HTMLDetailsElement).open = false })
      setCandidate(undefined); state.selectCard(undefined)
    }
  }}>
    <div className="form-summary">
      <strong className="current-form">{formSymbols[form]} {formNames[form]}</strong>
      {active && <>
        <KeywordTooltip topic="attunement" className={`attunement-${active.attunement}`}>{active.attunement === 'light' ? 'Light' : 'Dark'}</KeywordTooltip>
        <KeywordTooltip topic="charges">Charges <strong>{item?.charges ?? 0}/5</strong></KeywordTooltip>
        <KeywordTooltip topic="duration"><strong>{active.floorsLeft}</strong> {active.floorsLeft === 1 ? 'Floor Left' : 'Floors Left'}</KeywordTooltip>
      </>}
      {forms.recovery > 0 && <KeywordTooltip topic="recovery" className="recovery-label">Recovery: <strong>1 Floor</strong></KeywordTooltip>}
      <details className="form-picker" name="hud-panels">
        <summary>Forms <strong>{forms.inventory.length}/2</strong></summary>
        <div className="form-picker-panel hud-panel" data-tooltip-avoid>
          <strong>Carried transformations</strong> <KeywordTooltip topic="transformation" className="info-trigger">ⓘ</KeywordTooltip>
          {!forms.inventory.length && <p>No transformations carried. Use <button type="button" onClick={openTesting} aria-controls="dungeon-tools">Test forms</button> to grant one on this prototype.</p>}
          {forms.inventory.map((entry) => <div className="form-slot" key={entry.form}>
            <strong>{formSymbols[entry.form]} {formNames[entry.form]}</strong>
            <KeywordTooltip topic="charges"><strong>{entry.charges}/5</strong> charges</KeywordTooltip>
            <div>{entry.attunements.map((attunement) => <button key={attunement} className={`attunement-${attunement}`}
              disabled={locked} onClick={() => setCandidate({ form: entry.form, attunement })}>Inspect {attunement === 'light' ? 'Light' : 'Dark'}</button>)}</div>
          </div>)}
          {candidate && <div className="form-confirm">
            <strong>{formNames[candidate.form]} · {candidate.attunement === 'light' ? 'Light' : 'Dark'}</strong>
            <MovementGuide form={candidate.form} />
            <p>Basic: <strong>{formBalance[candidate.form].damage + state.focus + (candidate.attunement === 'light' ? formBalance.lightDamage : 0)}</strong> damage{state.focus > 0 ? ' including Focus' : ''} · <strong>{(candidate.form === 'rook' ? formBalance.rook.basicBlock : 0) + (candidate.attunement === 'dark' ? 1 : 0)}</strong> Block.</p>
            <p>{reason ?? '1 charge · 2 floors · 1 world turn.'}</p>
            <button disabled={locked || !!reason} onClick={(event) => {
              if (state.submitAction({ kind: 'transform', ...candidate })) { setCandidate(undefined); closePanel(event.currentTarget) }
            }}>Confirm activation</button>
            <button onClick={() => setCandidate(undefined)}>Cancel</button>
          </div>}
        </div>
      </details>
      <details className="form-picker" name="hud-panels">
        <summary>Moves</summary><div className="form-picker-panel hud-panel" data-tooltip-avoid>
          <strong>{formNames[form]} movement</strong><MovementGuide form={form} />
          <p>Basic: <strong>{basicDamage}</strong> damage · <strong>{basicBlock}</strong> Block{state.focus ? ' (includes Focus)' : ''}.</p>
          <KeywordTooltip topic="movement" className="info-trigger">ⓘ Movement details</KeywordTooltip>
          {form === 'knight' && <p>Walk: WASD/arrows. Leap: click L-destinations; Shift+key for four jumps.</p>}
        </div>
      </details>
      {active && <details className="form-picker" name="hud-panels"><summary>Return to Pawn</summary>
        <div className="form-picker-panel hud-panel" data-tooltip-avoid>
          <strong>Return to Pawn?</strong><p>The charge stays spent and unused duration is lost. Complete one full subsequent Pawn floor to recover.</p>
          {revertUnavailable && <p role="status">{revertUnavailable}</p>}
          <button disabled={locked || !!revertUnavailable} onClick={(event) => { if (state.submitAction({ kind: 'revert' })) closePanel(event.currentTarget) }}>Confirm return</button>
          <button onClick={(event) => closePanel(event.currentTarget)}>Cancel</button>
        </div>
      </details>}
      <button type="button" onClick={openTesting} aria-controls="dungeon-tools">Test forms</button>
    </div>
    <div className="form-ability">
      <span aria-hidden="true" className="ability-icon">{ability.icon}</span><strong>{ability.name}</strong>
      <strong className="ability-status">{status}</strong>
      <KeywordTooltip topic="ability" extra={signatureHelp} className="info-trigger">ⓘ</KeywordTooltip>
      <button disabled={locked || !!unavailable} onClick={state.selectAbility}>{state.selectedAbility ? 'Targeting' : 'Use'}</button>
      {state.selectedAbility && <>
        {form === 'knight' ? <span>{state.abilityDestination ? 'Choose a highlighted foe' : 'Choose an L-landing'}</span>
          : <button disabled={locked} onClick={() => state.tryAbility()}>Confirm use</button>}
        <button onClick={() => state.selectCard(undefined)}>Cancel</button>
      </>}
      {unavailable && status !== 'Used this floor' && !state.signatures.cooldowns[form] && <span className="form-unavailable">{unavailable}</span>}
    </div>
    <p className="transformation-feedback" role="status">
      {state.signatures.reveal?.foresight ? 'Foresight: revealed enemy plans shown; no active hazards on this floor.'
        : state.signatures.reveal ? `Astral Eye · ${state.signatures.reveal.turnsLeft} response left` : ''}
    </p>
  </section>
}
