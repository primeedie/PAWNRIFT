import { useEffect, useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'
import { biomes, floorLocation } from '../data/biomes'
import { eligibleInteractions } from '../game/logic/interactions'
import { useInteractionStore, focusInteraction, requestInteraction } from './interactionStore'
import { useInspectionStore } from './inspectionStore'
import { closeHudPanels } from './hudInteraction'

export function SeedEntry({disabled=false}:{disabled?:boolean}){
  const [seed,setSeed]=useState(''),[message,setMessage]=useState('')
  return <form className="seed-entry" onSubmit={event=>{
    event.preventDefault();const before=usePawnStore.getState().actionId
    usePawnStore.getState().loadDungeon(seed)
    if(usePawnStore.getState().actionId!==before){closeHudPanels(false);useAppStore.setState({screen:'scene'})}
    else setMessage('Enter 1–200 printable characters. Resolve any pending retention or save error first.')
  }}>
    <label>Master seed<input value={seed} maxLength={200} required onChange={event=>setSeed(event.target.value)} disabled={disabled}/></label>
    <button disabled={disabled}>Start seeded run</button><small>Manual seeds disable permanent rewards. The same seed reproduces initial content.</small>
    <p role="status">{message}</p>
  </form>
}
export function RunHUD(){
  const state=usePawnStore(),[message,setMessage]=useState('')
  if(state.training||!state.progress)return null
  const location=floorLocation(state.floorNumber)
  return <div className="run-hud" data-tooltip-avoid>
    <span>{location.biome.name} · Floor {location.local}/6 · {state.floorContent?.alignment==='dark'?'Void':'Hallowed'}</span>
    <details name="hud-panels"><summary>Run / seed</summary><div className="hud-panel run-panel" onKeyDown={event=>event.stopPropagation()}>
      <button onClick={()=>closeHudPanels()}>Close</button><h2>TIMEO KINGDOM</h2>
      <p>{state.progress.mode==='manual'?'Manual seed':state.playtestMode?'Development-modified random run':'Random run'} · {state.playtestMode||state.progress.mode==='manual'?'Boss rewards disabled':'Eligible for supported Knight consumable rewards. Permanent essences remain future work.'}</p>
      <label>Master seed<input readOnly value={state.masterSeed}/></label>
      <button onClick={async()=>{try{await navigator.clipboard.writeText(state.masterSeed);setMessage('Master seed copied.')}catch{setMessage('Select and copy the master seed field.')}}}>Copy seed</button>
      <button disabled={state.phase!=='ready'} onClick={()=>{state.restartSameSeed();closeHudPanels()}}>Restart same seed (manual)</button>
      <button disabled={state.phase!=='ready'} onClick={()=>{useAppStore.getState().newRun();closeHudPanels()}}>New random run</button>
      <details><summary>Enter a seed</summary><SeedEntry disabled={state.phase!=='ready'}/></details>
      <details><summary>Route history</summary>{biomes.map((biome,index)=><p key={biome.id}>{biome.name}: {state.progress!.routes.filter(vote=>Math.floor((vote.floor-1)/6)===index).map(vote=>`${(vote.floor-1)%6+1} ${vote.alignment==='light'?'L':'D'}`).join(' · ')||'No choices yet'}</p>)}</details>
      <details><summary>Original 12-card starter</summary><p>{state.deck.originalStarter?.join(' · ')}</p></details>
      <p role="status">{message||state.saveNotice}</p>
    </div></details>
  </div>
}
export function FloorInteractions(){
  const state=usePawnStore(),content=state.floorContent
  const focus=useInteractionStore(ui=>ui.focusedId)
  const aimingAttack=useInspectionStore(ui=>ui.aimingAttack)
  if(state.training||!content||state.progress?.finished)return null
  const items=eligibleInteractions(state),focused=items.find(item=>item.id===focus)??items[0]
  const explicit=state.selectedCardId||state.selectedAbility||aimingAttack
  return <div className="floor-interactions">
    {items.map(item=><button key={item.id} aria-label={`${item.label}, row ${item.cell.row+1}, column ${item.cell.column+1}`} aria-pressed={item.id===focused?.id} disabled={state.phase!=='ready'||!!explicit}
      onFocus={()=>focusInteraction(item.id)} onPointerEnter={()=>focusInteraction(item.id)} onClick={()=>requestInteraction(item.id)}>
      {item.id===focused?.id&&!explicit&&<kbd>E</kbd>} {item.label}{item.kind==='chest'?' · 1 turn':''}
    </button>)}
    {content.boss&&<span className="boss-development-note">{content.boss.name} · {content.boss.status==='unimplemented'?'Encounter unimplemented; development skip is in Playtest Tools.':content.boss.status==='defeated'?'Commander defeated. Reach the gateway to Astra Academy.':'Evade committed attacks; strike during recovery. Temporary balance fixtures.'}</span>}
  </div>
}
export function BiomeIntroduction(){
  const state=usePawnStore(),id=state.introBiome,runId=state.progress?.id
  useEffect(()=>{
    if(!id||state.training||!state.runActive)return
    const timer=window.setTimeout(()=>{const now=usePawnStore.getState();if(now.progress?.id===runId&&now.introBiome===id)now.dismissBiomeIntro()},3000)
    return ()=>window.clearTimeout(timer)
  },[id,runId,state.training,state.runActive])
  if(!id||state.training||!state.runActive)return null
  const biome=biomes.find(biome=>biome.id===id)!
  return <aside className="biome-introduction" key={`${runId}:${id}`} aria-label="Biome introduction">
    <h2>{biome.name}</h2><p>“{biome.quote}” <span>— Mirror Pawn</span></p><button onClick={state.dismissBiomeIntro}>Dismiss</button>
  </aside>
}
