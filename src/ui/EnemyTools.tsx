import { useState } from 'react'
import { enemies, enemyIds, patternNames, type EnemyId, type AttackPattern } from '../data/enemies'
import type { Attunement } from '../data/forms'
import { usePawnStore } from '../game/state/pawnStore'
import type { EnemyTestCommand } from '../game/logic/enemyTesting'
import { cellId } from '../game/logic/dungeon'
import { enemyIntentLabel } from '../game/logic/combat'
import { enemyName } from './enemyPresentation'
import { setCombatAudio, combatAudioEnabled } from './combatAudio'

export function EnemyTools(){
  const state=usePawnStore(),[kind,setKind]=useState<EnemyId>('initiate'),[variant,setVariant]=useState<Attunement>('light')
  const [passive,setPassive]=useState(false),[selected,setSelected]=useState(''),[pattern,setPattern]=useState<AttackPattern>('cut'),[message,setMessage]=useState('')
  const [audio,setAudio]=useState(combatAudioEnabled)
  const visible=state.enemies.filter(enemy=>enemy.tactics&&state.visible.has(cellId(enemy.cell)))
  const target=visible.find(enemy=>enemy.id===selected)??visible[0]
  const patterns=target&&target.kind!=='dummy'&&target.kind!=='rookling'?enemies[target.kind].patterns:[]
  const locked=!state.runActive||state.phase!=='ready'||state.hp<=0
  const apply=(command:EnemyTestCommand)=>setMessage((state.training?state.train({kind:'enemy-control',command}):state.playtest({kind:'enemy-control',command}))
    ?'Test state updated; no turn spent.':'Unavailable: check current sight, free terrain, target and attack lane.')
  return <details><summary>Porta enemies / boss testing</summary><fieldset disabled={locked}>
    <p>Temporary fixtures — BALANCE_PENDING_USER_DOCUMENT. All stats, attack ranges/timing, phase thresholds and encounter budgets await the statistics document.</p>
    <p>Close the controls, then move, defend or press Space to resolve a marked response. Training full sight is best for testing longer lanes; ordinary fog is unchanged.</p>
    <label className="dev-checkbox"><input type="checkbox" checked={audio} onChange={async event=>{const value=event.target.checked;if(await setCombatAudio(value))setAudio(value);else setMessage('Audio is unavailable in this browser.')}}/>Quiet synthesized combat cues</label>
    <label>Enemy<select value={kind} onChange={event=>setKind(event.target.value as EnemyId)}>{enemyIds.map(id=><option key={id} value={id}>{enemies[id].name}</option>)}</select></label>
    <label>Corruption<select value={variant} onChange={event=>setVariant(event.target.value as Attunement)}><option value="light">Hallowed</option><option value="dark">Void</option></select></label>
    <label className="dev-checkbox"><input type="checkbox" checked={passive} onChange={event=>setPassive(event.target.checked)}/>Passive target (otherwise sparring AI)</label>
    <button onClick={()=>apply({kind:'spawn',archetype:kind,variant,passive})}>Summon on free visible tile</button>
    <button onClick={()=>apply({kind:'clear'})}>Despawn enemy wave</button>
    {state.training&&<button onClick={()=>{state.train({kind:'roster-reset'});setMessage('Roster encounter restored.')}}>Reset roster encounter</button>}
    {!state.training&&<><button onClick={()=>state.debugProgress(6,Array(5).fill(variant))}>Enter / reset {variant==='light'?'Hallowed':'Void'} boss arena (modified run)</button></>}
    <label>Visible actor<select value={target?.id??''} onChange={event=>{setSelected(event.target.value);setPattern('cut')}}><option value="" disabled>Select</option>{visible.map(enemy=><option key={enemy.id} value={enemy.id}>{enemyName(enemy)} · {enemy.hp>0?'alive':'defeated'}</option>)}</select></label>
    {target&&<>
      <p>{enemyIntentLabel(target)} · phase {(target.tactics?.phase??0)+1} · pattern step {target.tactics?.step??0}. {target.tactics?.pending?`Committed cells: ${target.tactics.pending.cells.filter(cell=>state.visible.has(cellId(cell))).map(cell=>`${cell.column},${cell.row}`).join(' / ')||'guard stance'}`:'No pending attack.'}</p>
      <button onClick={()=>apply({kind:'reset',id:target.id})}>Reset actor / statuses</button>
      <button onClick={()=>apply({kind:'pause',id:target.id,value:!target.tactics?.paused})}>{target.tactics?.paused?'Resume':'Pause'} behavior</button>
      <button onClick={()=>apply({kind:'passive',id:target.id,value:!target.tactics?.passive})}>Use {target.tactics?.passive?'sparring AI':'passive target'}</button>
      <label>Attack<select value={patterns.includes(pattern)?pattern:patterns[0]??''} onChange={event=>setPattern(event.target.value as AttackPattern)}>{patterns.map(id=><option key={id} value={id}>{patternNames[id]}</option>)}</select></label>
      <button onClick={()=>apply({kind:'pattern',id:target.id,pattern:patterns.includes(pattern)?pattern:patterns[0]})}>Prepare selected telegraph (needs legal lane)</button>
      {target.boss&&[0,1].map(phase=><button key={phase} onClick={()=>apply({kind:'phase',id:target.id,phase:phase as 0|1})}>Test phase {phase+1} (clears plan, recovery first)</button>)}
      {(['burn','bleed','concussion','fear','exposed','clear'] as const).map(status=><button key={status} onClick={()=>apply({kind:'status',id:target.id,status})}>{status==='clear'?'Clear statuses':`Apply ${status}`}</button>)}
    </>}
    <p role="status">{message}</p>
  </fieldset></details>
}
