import { useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { biomes, floorLocation } from '../data/biomes'
import { floorToken } from '../game/logic/run'
import { canInteract } from '../game/logic/floorContent'
import type { Attunement } from '../data/forms'

export function ProgressionTools(){
  const state=usePawnStore(),[biome,setBiome]=useState(0),[floor,setFloor]=useState(1),[votes,setVotes]=useState<Attunement[]>(['light','light','light','dark','dark'])
  const locked=!state.runActive||state.phase!=='ready'||state.hp<=0
  return <details><summary>Progression / treasure testing</summary><p>Every jump, vote override, spawn or skip marks this run development-modified.</p>
    <p>{state.progress?.mode} · {floorLocation(state.floorNumber).biome.name} · Floor {floorLocation(state.floorNumber).local}/6</p>
    <label>Biome<select value={biome} onChange={event=>setBiome(Number(event.target.value))}>{biomes.map((biome,index)=><option key={biome.id} value={index}>{biome.name}</option>)}</select></label>
    <label>Floor<select value={floor} onChange={event=>setFloor(Number(event.target.value))}>{[1,2,3,4,5,6].map(floor=><option key={floor}>{floor}</option>)}</select></label>
    <fieldset><legend>Prior route choices (development)</legend>{votes.map((vote,index)=><label key={index}>Floor {index+1}<select value={vote} onChange={event=>setVotes(votes.map((value,i)=>i===index?event.target.value as Attunement:value))}><option value="light">Light</option><option value="dark">Dark</option></select></label>)}</fieldset>
    <button disabled={locked} onClick={()=>state.debugProgress(biome*6+floor,votes)}>Jump / set prior votes — development</button>
    <button disabled={locked||!state.floorContent?.boss||state.progress?.finished} onClick={()=>state.skipBoss(floorToken(state))}>Skip Boss — Development Only (no win/rewards)</button>
    <button disabled={locked||!!state.floorContent?.boss} onClick={state.debugChest}>Spawn nearby test chest — development</button>
    {state.floorContent?.chests.filter(chest=>chest.state==='closed'&&canInteract(state,chest.cell)).map(chest=><button disabled={locked} key={chest.id} onClick={()=>state.submitAction({kind:'open-chest',floorId:state.floorContent!.id,chestId:chest.id})}>Open test chest · real 1-turn response</button>)}
    <details><summary>Original starter deck</summary><p>{state.deck.originalStarter?.join(' · ')}</p></details>
  </details>
}
