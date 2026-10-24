import { create } from 'zustand'
import { usePawnStore } from '../game/state/pawnStore'
import { floorToken } from '../game/logic/run'
import { eligibleInteractions } from '../game/logic/interactions'
import type { Attunement } from '../data/forms'
import { useInspectionStore } from './inspectionStore'

type ExitRequest={token:string;actionId:number;alignment:Attunement}
export const useInteractionStore=create<{focusedId?:string;pending?:ExitRequest}>(()=>({}))
export function focusedInteraction(){
  const state=usePawnStore.getState(),items=eligibleInteractions(state)
  return items.find(item=>item.id===useInteractionStore.getState().focusedId)??items[0]
}
export function focusInteraction(id:string){
  if(eligibleInteractions(usePawnStore.getState()).some(item=>item.id===id))useInteractionStore.setState({focusedId:id})
}
export function requestInteraction(id:string){
  const state=usePawnStore.getState()
  if(!state.runActive||state.phase!=='ready'||useInteractionStore.getState().pending||state.selectedCardId||state.selectedAbility||useInspectionStore.getState().aimingAttack)return false
  const item=eligibleInteractions(state).find(item=>item.id===id)
  if(!item)return false
  useInteractionStore.setState({focusedId:id})
  if(item.kind==='chest')return state.submitAction({kind:'open-chest',floorId:state.floorContent!.id,chestId:item.chestId})
  useInteractionStore.setState({pending:{token:floorToken(state),actionId:state.actionId,alignment:item.alignment}})
  return true
}
export function cancelExit(){useInteractionStore.setState({pending:undefined})}
export function confirmExit(){
  const request=useInteractionStore.getState().pending,state=usePawnStore.getState()
  if(!request)return false
  cancelExit() // Consume the UI token before the guarded, atomic transition.
  if(request.actionId!==state.actionId||request.token!==floorToken(state))return false
  return state.leaveFloor(request.token,request.alignment)
}
export function contextAction(){
  const state=usePawnStore.getState()
  if(useInteractionStore.getState().pending)return false
  // Explicit combat intent wins. The Attack button calls tryAttack directly too.
  if(state.selectedCardId||state.selectedAbility||useInspectionStore.getState().aimingAttack)return state.tryAttack()
  const item=focusedInteraction()
  return item?requestInteraction(item.id):state.tryAttack()
}
// UI state never enters saves; stale requests cannot survive accepted actions or session changes.
usePawnStore.subscribe((state,previous)=>{
  if(state.actionId!==previous.actionId||!state.runActive||state.training||state.hp<=0)
    useInteractionStore.setState({pending:undefined,focusedId:undefined})
})
