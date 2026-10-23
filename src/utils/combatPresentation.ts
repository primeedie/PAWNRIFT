import type { CombatEvent } from '../game/logic/combat'
import { characterTiming, roninFollowupMs, type CharacterForm } from '../data/characterDesigns'

// Sequence visual-only secondary splash after its resolved primary cast.
// Sharpener keeps the existing authoritative event's independent delay.
export function impactPresentationDelay(event:CombatEvent,events:readonly CombatEvent[],form:CharacterForm='pawn') {
  if(event.actor==='pawn'&&event.kind==='hit'&&form==='pawn'&&event.breakdown?.category==='basic')return event.effect==='sharpener'?roninFollowupMs:characterTiming.pawn.impact
  if(event.actor==='pawn'&&event.kind==='hit'&&event.breakdown?.category==='signature'&&event.breakdown.source!=='Royal Decree')
    return form==='knight'?characterTiming.knight.signature*0.68:form==='queen'?characterTiming.queen.signature*0.48:event.delayMs??0
  if(event.breakdown?.source==='Swish splash') {
    const primary=events.find(other=>other.actor==='pawn'&&other.kind==='hit'&&other.breakdown?.source==='bishop basic')
    if(primary)return Math.max(event.delayMs??0,(primary.delayMs??0)+45)
  }
  if(event.actor==='pawn'&&event.kind==='hit'&&event.breakdown?.category==='card'&&!event.delayMs)return characterTiming[form].impact
  return event.delayMs??0
}
export function targetReaction(elapsed:number,impact:number){
  const t=(elapsed-impact)/180
  return t>0&&t<1?Math.sin(t*Math.PI):0
}
