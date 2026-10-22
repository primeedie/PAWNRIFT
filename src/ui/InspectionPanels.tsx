import { useEffect, type ReactNode } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { formNames, formSymbols, transformationRules } from '../data/forms'
import { combatPassives, passiveBalance as p } from '../data/passives'
import { combatBalance } from '../data/combatBalance'
import { characterStats, signatureInfo } from './inspectionPresentation'
import { inspectedEnemy, useInspectionStore } from './inspectionStore'
import { enemyName, enemyStatuses } from './enemyPresentation'
import { enemyIntentLabel, foresightIntent } from '../game/logic/combat'
import { restoreGameFocus } from './hudInteraction'

function Row({ label, children }: { label: string; children: ReactNode }) { return <div><dt>{label}</dt><dd>{children}</dd></div> }

export function CharacterInformation() {
  const state=usePawnStore(),ui=useInspectionStore(),stats=characterStats(state),ability=signatureInfo(state)
  useEffect(()=>{if(ui.characterOpen)document.getElementById('character-information')?.focus({preventScroll:true})},[ui.characterOpen])
  if (!ui.characterOpen) return null
  const active=state.transformations.active,item=state.transformations.inventory.find(item=>item.form===active?.form)
  const passive=combatPassives[stats.form]
  return <section id="character-information" className="inspection-panel character-information" role="region" tabIndex={-1} aria-labelledby="character-information-title" data-inspection-root data-tooltip-avoid>
    <header><h2 id="character-information-title"><span aria-hidden="true">{formSymbols[stats.form]}</span> {formNames[stats.form]}</h2>
      <button onClick={()=>{ui.closeCharacter();document.querySelector<HTMLButtonElement>('.form-identity-icon')?.focus()}} aria-label="Close character information">×</button></header>
    <p className={`inspection-attunement attunement-${active?.attunement ?? 'light'}`}>{active ? `${active.attunement==='light'?'Light':'Dark'} attunement` : 'Pawn · untransformed'}</p>
    <h3>Combat</h3><dl className="inspection-stats">
      <Row label="Next basic"><strong>{stats.damage}</strong>{stats.bonus>0 && <> + <strong>{stats.bonus}</strong> {stats.form==='pawn'?'follow-up':'Smite'}</>}</Row>
      <Row label="Range"><strong>{stats.range}</strong> tile{stats.range!==1?'s':''} · {stats.directions.toLowerCase()}</Row>
      {stats.focus>0 && <Row label="Focus included"><strong>+{stats.focus}</strong> on main hit</Row>}
      <Row label="Current Block"><strong>{stats.block}</strong></Row>
      {stats.basicBlock>0 && <Row label="Block on basic"><strong>+{stats.basicBlock}</strong> this response</Row>}
      <Row label="Defend"><strong>−{combatBalance.guardReduction}</strong> incoming{stats.guarding>0?' · guarding now':''}</Row>
      {stats.form==='king' && <Row label="Royal Poise"><strong>−{p.kingPoise}</strong> first direct hit per response</Row>}
    </dl><p className="inspection-note">Damage before target defense, Block or Exposed. A basic selects one foe.</p>
    <h3>{passive.icon} {passive.name}</h3><dl className="inspection-stats">
      {stats.form==='pawn' && <><Row label="Stacks"><strong>{state.passives.sharpener}/{p.sharpenerCap}</strong></Row><Row label="Basic / skill bonus"><strong>+{state.passives.sharpener} / +{Math.min(state.passives.sharpener,p.sharpenerSkillCap)}</strong></Row></>}
      {stats.form==='knight' && <Row label="Defense ignored"><strong>{p.penetration*100}%</strong> · rounded down</Row>}
      {stats.form==='bishop' && <><Row label="Splash"><strong>{p.splashDamage}</strong> · up to {p.splashTargets} neighbors</Row><Row label="Burn"><strong>{p.burnDamage} × {p.burnTurns}</strong> · opposite checker color</Row></>}
      {stats.form==='rook' && <><Row label="Responses to stun"><strong>{p.concussionDelay.normal}/{p.concussionDelay.elite}/{p.concussionDelay.boss}</strong> · normal/elite/boss</Row><Row label="Immunity after stun"><strong>{p.stunImmunity.normal}/{p.stunImmunity.elite}/{p.stunImmunity.boss}</strong> turns</Row></>}
      {stats.form==='queen' && <><Row label="Bleed per stack"><strong>{p.bleedDamage} × {p.bleedTurns}</strong> subsequent ticks</Row><Row label="Stack cap"><strong>{p.bleedCap}</strong> · independent expiration</Row></>}
      {stats.form==='king' && <><Row label="Stored Smite"><strong>+{state.passives.smite}/{p.smiteCap}</strong></Row><Row label="Gain per offense"><strong>+{p.smiteGain}</strong> · one shared action budget</Row><Row label="Basics until push"><strong>{p.kingPushEvery-state.passives.kingBasics%p.kingPushEvery}</strong></Row></>}
    </dl><details><summary>Passive rules</summary><p>{passive.summary}</p></details>
    <h3>{ability.name}</h3><p>{ability.description}</p><dl className="inspection-stats"><Row label="Availability"><strong>{ability.status}</strong></Row><Row label="Limit">{ability.limit}</Row></dl>
    {ability.unavailable && <p className="inspection-note">{ability.unavailable}</p>}
    <h3>Transformation</h3><dl className="inspection-stats">
      {active && <><Row label="Shared charges"><strong>{item?.charges ?? 0}/{transformationRules.charges}</strong></Row><Row label="Floors left"><strong>{active.floorsLeft}</strong></Row></>}
      {!active && <Row label="Active item">None</Row>}
      <Row label="Pawn recovery"><strong>{state.transformations.recovery}</strong> floor{state.transformations.recoveryStartsNextFloor?' · full next floor':''}</Row>
    </dl>
  </section>
}

export function EnemyInformation() {
  const state=usePawnStore(),ui=useInspectionStore(),enemy=inspectedEnemy(state,ui.enemyId)
  useEffect(()=>{if(enemy && !document.activeElement?.matches('.inspect-foe-select'))document.getElementById('enemy-information')?.focus({preventScroll:true})},[enemy?.id])
  if (!enemy) return null
  const spec=state.training?.dummies.find(spec=>spec.id===enemy.id),statuses=enemyStatuses(enemy).filter(status=>status.tone!=='threat'),foresight=foresightIntent(state,enemy.id)
  return <section id="enemy-information" className="inspection-panel enemy-information" role="region" tabIndex={-1} aria-labelledby="enemy-information-title" data-inspection-root data-tooltip-avoid>
    <header><h2 id="enemy-information-title">{enemyName(enemy)}</h2><button onClick={()=>{ui.closeEnemy();restoreGameFocus()}} aria-label="Close enemy information">×</button></header>
    <p>{enemy.boss?'Boss':enemy.elite?'Elite':'Normal'}{enemy.kind==='dummy'?' · training dummy':''}</p>
    <p className="inspection-health"><strong>{enemy.hp}/{enemy.maxHp}</strong> HP</p>
    <span className="health-track" role="progressbar" aria-label={`${enemyName(enemy)} health`} aria-valuemin={0} aria-valuemax={enemy.maxHp} aria-valuenow={enemy.hp}><span style={{width:`${100*enemy.hp/enemy.maxHp}%`}} /></span>
    <dl className="inspection-stats"><Row label="Defense"><strong>{enemy.defense ?? 0}</strong></Row><Row label="Current Block"><strong>{enemy.block ?? 0}</strong></Row><Row label="Intent">{enemyIntentLabel(enemy)}</Row>{foresight && <Row label="Foresight">{foresight}</Row>}</dl>
    <h3>Statuses</h3>{!statuses.length && <p className="inspection-note">No active statuses.</p>}
    <ul className="inspection-statuses">{statuses.map(status=><li key={status.label}><span aria-hidden="true" className={`status-${status.tone ?? 'neutral'}`}>{status.icon}{status.count ?? ''}</span><span>{status.label}</span></li>)}</ul>
    {(enemy.burn||enemy.bleed?.length) && <p className="inspection-note">{enemy.burn?`Burn: ${p.burnDamage} damage per subsequent tick. `:''}{enemy.bleed?.length?`Bleed: ${p.bleedDamage} per stack; each expires independently.`:''}</p>}
    {spec && <><h3>Dummy configuration</h3><dl className="inspection-stats"><Row label="Class">{spec.rank}</Row><Row label="Behavior">{spec.behavior}</Row><Row label="Configured HP"><strong>{spec.hp}</strong></Row><Row label="Defense / initial Block"><strong>{spec.defense} / {spec.block}</strong></Row><Row label="Knockback">{spec.knockback?'Allowed':'Resisted'}</Row></dl></>}
  </section>
}

export function InspectionPanels() {
  const ui=useInspectionStore()
  return <div className="inspection-panels" data-last={ui.lastPanel} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
    <CharacterInformation/><EnemyInformation/>
  </div>
}
