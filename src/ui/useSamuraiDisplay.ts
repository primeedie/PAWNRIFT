import { useEffect, useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'

// Present already-resolved charge consumption alongside queued katana deflections.
// Cleanup on menu, reset, transformation or unmount; never mutate game state.
export function useSamuraiDisplay() {
  const state=usePawnStore(),[display,setDisplay]=useState({id:-1,charges:0})
  const parries=state.phase==='enemies'?state.events.filter(e=>e.parryKind==='samurai'):[]
  useEffect(()=>{
    if(!state.runActive||state.phase!=='enemies'||!parries.length)return
    setDisplay({id:state.actionId,charges:(parries[0].parriesLeft??0)+1})
    const timers=parries.map(event=>window.setTimeout(()=>setDisplay({id:state.actionId,charges:event.parriesLeft??0}),(event.delayMs??0)+50))
    return ()=>timers.forEach(timer=>window.clearTimeout(timer))
  },[state.actionId,state.phase,state.runActive,state.events])
  return state.runActive&&state.phase==='enemies'&&parries.length&&display.id===state.actionId?display.charges:state.signatures.samuraiCharges
}
