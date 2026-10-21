import { useState } from 'react'
import { formAbilities, formBalance, formNames, formSymbols, type Attunement, type BossForm } from '../data/forms'
import { activationReason, currentForm } from '../game/logic/transformations'
import { abilityReason } from '../game/logic/formCombat'
import { usePawnStore } from '../game/state/pawnStore'
import { KeywordTooltip } from './KeywordTooltip'

export function TransformationHUD() {
  const state = usePawnStore()
  const forms = state.transformations
  const form = currentForm(forms)
  const [candidate, setCandidate] = useState<{ form: BossForm; attunement: Attunement }>()
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  const item = forms.inventory.find((entry) => entry.form === forms.active?.form)
  const reason = candidate ? activationReason(forms, candidate.form, candidate.attunement) : undefined
  const abilityUnavailable = abilityReason(state)
  const active = forms.active
  const light = active?.attunement === 'light'
  const abilityDetails = !active ? '' : active.form === 'bishop'
    ? `${formBalance.bishop.abilityCost} Energy. ${light ? 'Gain 1 Focus and 3 Block' : 'Gain 5 Block'} for the coming response.`
    : active.form === 'queen' ? '2 Energy. Two close-range hits: Light 4 each; Dark 3 each plus 2 Block. Focus boosts only the first hit.'
      : active.form === 'knight' ? '1 Energy. Thrust at one visible foe up to 2 straight tiles away. Light 5 damage; Dark 4 damage and 2 Block.'
        : '1 Energy. Strike the first visible foe up to 3 straight tiles away. Light 6 damage; Dark 5 damage and 2 Block.'
  return <section className="transformation-hud" aria-label="Transformations" onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Escape') { setCandidate(undefined); state.selectCard(undefined) }
  }}>
    <div className="form-summary">
      <KeywordTooltip topic="movement"><strong>{formSymbols[form]} {formNames[form]}</strong></KeywordTooltip>
      {active && <>
        <KeywordTooltip topic="attunement" className={`attunement-${active.attunement}`}>{light ? 'Light' : 'Dark'}</KeywordTooltip>
        <KeywordTooltip topic="charges">Charges <strong>{item?.charges ?? 0}/5</strong></KeywordTooltip>
        <KeywordTooltip topic="duration"><strong>{active.floorsLeft}</strong> {active.floorsLeft === 1 ? 'Floor Left' : 'Floors Left'}</KeywordTooltip>
      </>}
      {forms.recovery > 0 && <KeywordTooltip topic="recovery" className="recovery-label">Recovery: <strong>1 Floor</strong></KeywordTooltip>}
      <details className="form-picker">
        <summary>Forms <strong>{forms.inventory.length}/2</strong></summary>
        <div className="form-picker-panel">
          <KeywordTooltip topic="transformation">Carried transformations</KeywordTooltip>
          {!forms.inventory.length && <p>No transformations carried.</p>}
          {forms.inventory.map((entry) => <div className="form-slot" key={entry.form}>
            <strong>{formSymbols[entry.form]} {formNames[entry.form]}</strong>
            <KeywordTooltip topic="charges"><strong>{entry.charges}/5</strong> charges</KeywordTooltip>
            <div>{entry.attunements.map((attunement) => <button key={attunement}
              className={`attunement-${attunement}`} disabled={locked}
              onClick={() => setCandidate({ form: entry.form, attunement })}>
              Inspect {attunement === 'light' ? 'Light' : 'Dark'}
            </button>)}</div>
          </div>)}
          {candidate && <div className="form-confirm">
            <strong>{formNames[candidate.form]} · {candidate.attunement === 'light' ? 'Light' : 'Dark'}</strong>
            <p>{reason ?? 'Activate: 1 charge, 2 floors, 1 world turn.'}</p>
            <button disabled={locked || !!reason} onClick={() => {
              if (state.submitAction({ kind: 'transform', ...candidate })) setCandidate(undefined)
            }}>Confirm activation</button>
            <button onClick={() => setCandidate(undefined)}>Cancel</button>
          </div>}
        </div>
      </details>
    </div>
    {active && <div className="form-ability">
      <KeywordTooltip topic="ability" extra={abilityDetails}><strong>{formAbilities[active.form]}</strong> · {formBalance[active.form].abilityCost} Energy</KeywordTooltip>
      <button disabled={locked || !!abilityUnavailable} onClick={state.selectAbility}>Choose ability</button>
      {state.selectedAbility && <>
        <span>{active.form === 'bishop' ? 'Ward yourself' : 'Click a highlighted foe'}</span>
        {active.form === 'bishop' && <button disabled={locked} onClick={() => state.tryAbility()}>Use Ward</button>}
        <button onClick={() => state.selectCard(undefined)}>Cancel</button>
      </>}
      {abilityUnavailable && <span className="form-unavailable">{abilityUnavailable}</span>}
    </div>}
    <p className="transformation-feedback" role="status">
      {forms.recovery > 0 ? 'Pawn recovery: complete a full floor before transforming.'
        : active ? `${formNames[active.form]} · ${light ? 'Light' : 'Dark'} active` : ''}
    </p>
  </section>
}
