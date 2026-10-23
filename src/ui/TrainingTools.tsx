import { useEffect, useState } from 'react'
import { ArtControls } from './ArtControls'
import { testForms, formNames, type Attunement } from '../data/forms'
import { usePawnStore } from '../game/state/pawnStore'
import { defaultDummy, trainingDummyPositions, trainingScenarios, type DummySpec, type TrainingCommand, type TrainingForm } from '../game/logic/training'
import { damagePerTurn } from '../game/logic/combatAnalysis'
import { cellId } from '../game/logic/dungeon'
import { closeHudPanels } from './hudInteraction'
import { sparringPatterns } from '../game/logic/playerDefense'
import { characterDesigns } from '../data/characterDesigns'

function DummySettings({ spec, apply, locked }: { spec: DummySpec; apply: (command: TrainingCommand) => void; locked: boolean }) {
  const state = usePawnStore(), [draft, setDraft] = useState(spec)
  useEffect(() => setDraft(spec), [spec])
  const enemy = state.enemies.find((enemy) => enemy.id === spec.id && state.visible.has(cellId(enemy.cell)))
  const number = (key: 'hp' | 'defense' | 'block', value: string) => setDraft({ ...draft, [key]: Number(value) })
  return <details><summary>{spec.id} settings</summary><fieldset disabled={locked}>
    <label>Class<select value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value as DummySpec['rank'], knockback: event.target.value !== 'boss' })}>
      <option value="normal">Normal</option><option value="elite">Elite</option><option value="boss">Boss resistance</option>
    </select></label>
    <label>Sparring attack pattern<select value={draft.pattern??'telegraphed'} onChange={event=>setDraft({...draft,pattern:event.target.value as DummySpec['pattern']})}>
      {sparringPatterns.map(pattern=><option key={pattern} value={pattern}>{pattern==='telegraphed'?'Marked melee (normal timing)':`${pattern} sample each response`}</option>)}
    </select></label>
    <label>HP<input type="number" min={1} max={100000} value={draft.hp} onChange={(event) => number('hp', event.target.value)} /></label>
    <label>Defense<input type="number" min={0} max={1000} value={draft.defense} onChange={(event) => number('defense', event.target.value)} list="defense-presets" /></label>
    <label>Initial Block<input type="number" min={0} max={10000} value={draft.block} onChange={(event) => number('block', event.target.value)} /></label>
    <label>Behavior<select value={draft.behavior} onChange={(event) => setDraft({ ...draft, behavior: event.target.value as DummySpec['behavior'] })}>
      <option value="passive">Passive — response only</option><option value="sparring">Sparring — marked strikes</option>
    </select></label>
    <label>Column (0–7)<input type="number" min={0} max={7} value={draft.cell.column} onChange={(event) => setDraft({ ...draft, cell: { ...draft.cell, column: Number(event.target.value) } })} /></label>
    <label>Row (0–7)<input type="number" min={0} max={7} value={draft.cell.row} onChange={(event) => setDraft({ ...draft, cell: { ...draft.cell, row: Number(event.target.value) } })} /></label>
    <label className="dev-checkbox"><input type="checkbox" checked={draft.knockback} onChange={(event) => setDraft({ ...draft, knockback: event.target.checked })} />Allow knockback</label>
    <button onClick={() => apply({ kind: 'dummies', specs: state.training!.dummies.map((item) => item.id === spec.id ? draft : item) })}>Apply / reset comparison</button>
    <button onClick={() => apply({ kind: 'dummy-resource', id: spec.id, resource: 'hp' })}>Restore HP</button>
    <button onClick={() => apply({ kind: 'dummy-resource', id: spec.id, resource: 'block' })}>Restore Block</button>
    {enemy && <p>HP {enemy.hp}/{enemy.maxHp} · Block {enemy.block ?? 0}<br />Burn {enemy.burn?.turnsLeft ?? 0} · Bleed [{enemy.bleed?.map((stack) => stack.turnsLeft).join(', ') || 'none'}]<br />Concussion {enemy.concussion ?? 'none'} · Immunity {enemy.stunImmunity ?? 0}</p>}
  </fieldset></details>
}
export function CombatAnalysis() {
  const state = usePawnStore(), analysis = state.training!.analysis
  const rows = analysis.history.filter((event) => event.breakdown)
  return <details className="combat-analysis"><summary>Combat Analysis</summary>
    <dl className="diagnostic-values">
      <dt>Observed HP damage</dt><dd>{analysis.total}</dd><dt>Basic actions</dt><dd>{analysis.basic}</dd>
      <dt>Cards / skills / counters</dt><dd>{analysis.skills}</dd><dt>Direct passive portion</dt><dd>{analysis.passive}</dd>
      <dt>DoT</dt><dd>{analysis.dot}</dd><dt>Absorbed Block / overkill</dt><dd>{analysis.blocked} / {analysis.overkill}</dd>
      <dt>Offensive actions / actions</dt><dd>{analysis.attacks} / {analysis.actions}</dd><dt>Completed turns</dt><dd>{analysis.turns}</dd>
      <dt>DPT</dt><dd>{damagePerTurn(analysis).toFixed(2)}</dd><dt>Received / blocked</dt><dd>{analysis.received} / {analysis.defended}</dd>
    </dl>
    <p>Since analysis reset. Passive portion is a subset of direct damage; DoT is separate. Only seen events are shown, including in the fog scenario.</p>
    <button disabled={state.phase !== 'ready'} onClick={() => state.train({ kind: 'analysis' })}>Reset analysis</button><button disabled={state.phase !== 'ready'} onClick={() => state.train({ kind: 'log' })}>Clear event log</button>
    <ol className="analysis-log">{rows.slice(-16).map((event) => {
      const hit = event.breakdown!
      return <li key={event.id}><strong>{hit.source}: {hit.hpDamage} HP</strong> · {event.targetId}
        <details><summary>Calculation</summary><p>Base {hit.base} + skill {hit.skill ?? 0} + attunement {hit.attunement ?? 0} {hit.attunementName ?? 'Pawn'} + Focus {hit.focus ?? 0} + Exposed {hit.exposed} + passive {hit.passive ?? 0}; defense −{hit.defense} (penetrated {hit.penetration}), Block −{hit.blocked}, overkill {hit.overkill}.</p>{hit.stackDamage?.map((stack, index) => <p key={index}>Bleed stack {index + 1}: {stack.hpDamage} HP (raw {stack.raw}); {stack.remaining} ticks before this tick.</p>)}</details>
      </li>
    })}</ol>
    <details><summary>Recent response/status events</summary><ol className="analysis-log">{analysis.history.slice(-16).map((event) => <li key={event.id}>{event.kind} · {event.actor}{event.effect ? ` · ${event.effect}` : ''}{event.amount !== undefined ? ` · ${event.amount}` : ''}</li>)}</ol></details>
  </details>
}
export default function TrainingTools() {
  const state = usePawnStore(), training = state.training!
  const [form, setForm] = useState<TrainingForm>('pawn'), [attunement, setAttunement] = useState<Attunement>('light')
  const [message, setMessage] = useState(''), [position, setPosition] = useState({ column: 3, row: 3 })
  const locked = state.phase !== 'ready'
  const apply = (command: TrainingCommand) => setMessage(state.train(command) ? 'Training state updated; no world turn spent.' : 'Unavailable: finish the action and check free terrain, positions and values.')
  return <details id="training-tools" className="dungeon-dev-tools" name="hud-panels" data-tooltip-avoid onKeyDown={(event) => {
    event.stopPropagation(); if (event.key === 'Escape') closeHudPanels()
  }}><summary>Training Grounds</summary><div className="playtest-contents">
    <button onClick={closeHudPanels}>Close controls</button><button onClick={() => { closeHudPanels(); state.leaveTraining() }}>Leave Training</button>
    <p>Isolated local session. Run resources, charges, turns and RNG remain paused. Close controls to move or attack. Sample patterns are training-only; direct melee requires adjacency, other samples use range 4.</p>
    <details id="transformation-testing"><summary>Form and attunement</summary><fieldset disabled={locked}>
      <label>Form<select value={form} onChange={(event) => setForm(event.target.value as TrainingForm)}>{(['pawn', ...testForms] as const).map((id) => <option key={id} value={id}>{formNames[id]}</option>)}</select></label>
      <label>Attunement<select value={attunement} onChange={(event) => setAttunement(event.target.value as Attunement)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <p>Weapon: {characterDesigns[form][attunement]}</p>
      <button onClick={() => { apply({ kind: 'form', form, attunement }); closeHudPanels() }}>Equip training form (free)</button>
      <button onClick={() => apply({ kind: 'restore', resource: 'charges' })}>Reset training charges / recovery</button>
      <button onClick={() => apply({ kind: 'restore', resource: 'cooldowns' })}>Reset cooldowns / Eye</button>
    </fieldset></details>
    <details><summary>Arena and dummies</summary><fieldset disabled={locked}>
      <label>Scenario<select value={training.scenario} onChange={(event) => apply({ kind: 'scenario', scenario: event.target.value as typeof training.scenario })}>{trainingScenarios.map((id) => <option key={id}>{id}</option>)}</select></label>
      <p>Open arena has full sight. Eye uses normal fog and actual seeded Astral Eye. Blocked/perch scenarios add designated solid test geometry.</p>
      <label>Dummies<select value={training.dummies.length} onChange={(event) => {
        const cells = [...(training.scenario==='open'?[{column:4,row:3},{column:3,row:4},{column:2,row:3},{column:3,row:2}]:trainingDummyPositions(training.scenario)), { column: 5, row: 3 }, { column: 2, row: 3 }, { column: 3, row: 2 }]
          .filter((cell, index, list) => list.findIndex((entry) => entry.column === cell.column && entry.row === cell.row) === index && !state.dungeon.tiles.some((tile) => tile.column === cell.column && tile.row === cell.row && tile.blocksMovement) && (cell.column !== state.cell.column || cell.row !== state.cell.row))
        apply({ kind: 'dummies', specs: Array.from({ length: Number(event.target.value) }, (_, index) => ({ ...(training.dummies[index] ?? defaultDummy(index)), cell: cells[index] })) })
      }}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
      <button onClick={() => apply({ kind: 'dummy-reset' })}>Reset configured dummies</button>
      <label>Player column<input type="number" min={0} max={7} value={position.column} onChange={(event) => setPosition({ ...position, column: Number(event.target.value) })} /></label>
      <label>Player row<input type="number" min={0} max={7} value={position.row} onChange={(event) => setPosition({ ...position, row: Number(event.target.value) })} /></label>
      <button onClick={() => apply({ kind: 'position', cell: position })}>Place player (free)</button>
    </fieldset><datalist id="defense-presets">{[0, 2, 5, 10].map((value) => <option key={value} value={value} />)}</datalist>
      {training.dummies.map((spec) => <DummySettings key={spec.id} spec={spec} apply={apply} locked={locked} />)}
    </details>
    <details><summary>Resources and resets</summary><fieldset disabled={locked}>
      {(['hp', 'energy', 'focus', 'deck'] as const).map((resource) => <button key={resource} onClick={() => apply({ kind: 'restore', resource })}>Restore {resource}</button>)}
      <button onClick={() => apply({ kind: 'statuses' })}>Clear dummy statuses</button><button onClick={() => apply({ kind: 'passives' })}>Reset passive stacks</button>
      <button onClick={()=>apply({kind:'samurai-reset'})}>Reset Samurai Mode (clear parries)</button>
      <button onClick={() => { closeHudPanels(); state.submitAction({ kind: 'wait' }) }}>Advance one training world turn</button>
      <button onClick={() => apply({ kind: 'reset' })}>Reset training comparison</button>
    </fieldset></details>
    <details><summary>Automatic parry events</summary><p>Samurai Mode: {state.signatures.samuraiCharges}/3 · cooldown {state.signatures.cooldowns.pawn}</p><ol className="analysis-log">{training.analysis.history.filter(event=>event.parryKind==='samurai').slice(-9).map(event=><li key={event.id}>Auto-parry · {event.attackKind} · {event.parriesLeft}/3 remaining</li>)}</ol></details>
    <ArtControls viewer/><CombatAnalysis /><p role="status">{message}</p>
  </div></details>
}
