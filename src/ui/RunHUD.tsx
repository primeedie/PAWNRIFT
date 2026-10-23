import { useEffect, useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'
import { biomes, floorLocation } from '../data/biomes'
import { alignmentCounts, canInteract, pendingChest } from '../game/logic/floorContent'
import { floorToken } from '../game/logic/run'
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
  const location=floorLocation(state.floorNumber),counts=alignmentCounts(state.progress.routes,state.floorNumber)
  return <div className="run-hud" data-tooltip-avoid>
    <span>{location.biome.name} · Floor {location.local}/6</span><span>Light {counts.light} / Dark {counts.dark}</span>
    <details name="hud-panels"><summary>Run / seed</summary><div className="hud-panel run-panel" onKeyDown={event=>event.stopPropagation()}>
      <button onClick={()=>closeHudPanels()}>Close</button><h2>TIMEO KINGDOM</h2>
      <p>{state.progress.mode==='manual'?'Manual seed':state.playtestMode?'Development-modified random run':'Random run'} · {state.playtestMode||state.progress.mode==='manual'?'Permanent rewards disabled':'Eligible creation mode; boss rewards are not implemented yet.'}</p>
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
  if(state.training||!content||state.progress?.finished)return null
  const locked=state.phase!=='ready'||!!pendingChest(state),token=floorToken(state)
  return <div className="floor-interactions">
    {content.chests.filter(chest=>chest.state==='closed'&&canInteract(state,chest.cell)).map(chest=><button key={chest.id} disabled={locked} onClick={()=>state.submitAction({kind:'open-chest',floorId:content.id,chestId:chest.id})}>Open chest · 1 turn</button>)}
    {content.exits.filter(exit=>canInteract(state,exit.cell,true)).map(exit=><button key={exit.alignment} className={`attunement-${exit.alignment}`} disabled={locked||state.enemies.some(enemy=>enemy.hp>0)} onClick={()=>state.leaveFloor(token,exit.alignment)}>
      {exit.alignment==='light'?'Hallowed':'Void'} exit{state.enemies.some(enemy=>enemy.hp>0)?' · clear floor first':''}
    </button>)}
    {content.boss&&<span className="boss-development-note">{content.boss.name} · {content.boss.variant==='light'?'Hallowed':'Void'} arena. Encounter unimplemented; development skip is in Playtest Tools.</span>}
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
