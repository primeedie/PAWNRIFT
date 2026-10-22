import type { CombatEvent } from '../game/logic/combat'
import { characterTiming, type CharacterForm } from '../data/characterDesigns'

// Sequence visual-only secondary splash after its resolved primary cast.
// Sharpener keeps the existing authoritative event's independent delay.
export function impactPresentationDelay(event:CombatEvent,events:readonly CombatEvent[],form:CharacterForm='pawn') {
  if(event.breakdown?.source==='Swish splash') {
    const primary=events.find(other=>other.actor==='pawn'&&other.kind==='hit'&&other.breakdown?.source==='bishop basic')
    if(primary)return Math.max(event.delayMs??0,(primary.delayMs??0)+45)
  }
  if(event.actor==='pawn'&&event.kind==='hit'&&event.breakdown?.category==='card'&&!event.delayMs)return characterTiming[form].impact
  return event.delayMs??0
}
