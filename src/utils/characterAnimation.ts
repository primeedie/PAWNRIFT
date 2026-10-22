import { characterTiming, parryPresentationMs, type CharacterForm } from '../data/characterDesigns'
import { turnTiming } from '../data/combatBalance'
import type { GameState } from '../game/logic/combat'
import type { Attunement } from '../data/forms'

export type AnimationCue = 'idle' | 'move' | 'attack' | 'signature' | 'defend' | 'parry' | 'counter' | 'hit' | 'transform' | 'revert' | 'death'
export function enemyPresentationDuration(state:GameState){
  return Math.max(turnTiming.enemyMs,...state.events.filter(e=>e.kind==='parry'&&e.actor==='pawn').map(e=>(e.delayMs??0)+parryPresentationMs))
}
export function parryPresentation(state:GameState,elapsed:number){
  const event=state.events.find(e=>e.kind==='parry'&&e.actor==='pawn'&&elapsed>=(e.delayMs??0)&&elapsed<(e.delayMs??0)+parryPresentationMs)
  return event?{progress:(elapsed-(event.delayMs??0))/parryPresentationMs,sourceId:event.sourceId}:undefined
}
export function animationCue(state: GameState, phase: 'ready' | 'player' | 'enemies'): AnimationCue {
  if (state.hp <= 0) return 'death'
  if (phase === 'enemies') {
    const response = state.events.filter((event) => event.actor === 'pawn' && (event.kind === 'counter' || event.kind === 'parry'))
    if (response.some((event) => event.kind === 'counter')) return 'counter'
    if (response.some((event) => event.kind === 'parry')) return 'parry'
    if (state.events.some((event) => event.targetId === 'pawn' && event.kind === 'hit' && (event.amount ?? 0) > 0)) return 'hit'
    return state.guarding || state.lastAction === 'defend' || state.lastAction === 'ability' ? 'defend' : 'idle'
  }
  if (phase === 'ready') return 'idle'
  if (state.lastAction === 'ability') return 'signature'
  if (state.lastAction === 'attack') return 'attack'
  if (state.lastAction === 'move') return 'move'
  if (state.lastAction === 'transform') return 'transform'
  if (state.lastAction === 'revert') return 'revert'
  if (state.lastAction === 'defend' || state.events.some((event) => event.kind === 'guard')) return 'defend'
  if (state.events.some((event) => event.kind === 'move' && event.actor === 'pawn')) return 'move'
  return state.events.some((event) => event.kind === 'hit' && event.actor === 'pawn') ? 'attack' : 'idle'
}
export function presentationDuration(state: GameState) {
  const form: CharacterForm = state.transformations.active?.form ?? 'pawn'
  const timing = characterTiming[form]
  if (state.lastAction === 'transform' || state.lastAction === 'revert') return 340
  if (state.events.some((event) => event.effect === 'sharpener')) return 620
  if (state.lastAction === 'move') return timing.move
  if (state.lastAction === 'attack') return timing.basic
  if (state.lastAction === 'ability') return timing.signature
  if (state.events.some(event=>event.actor==='pawn'&&event.kind==='hit'&&event.breakdown?.category==='card')) return timing.basic
  return 300
}
export type CharacterPose = { lean: number; twist: number; leftArm: number; rightArm: number; leftLeg: number; rightLeg: number;
  draw: number; slash: number; guard: number; pulse: number; scale: number; cape: number;
  swing: number; thrust: number; cast: number; crouch: number; head: number; hip: number; bladeTurn: number }
const ramp = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t-a)/(b-a)))
const envelope = (t: number, a: number, b: number, c: number) => ramp(t,a,b)*(1-ramp(t,b,c))
export function characterPose(form: CharacterForm, cue: AnimationCue, progress: number, reduced = false, variant:Attunement='light'): CharacterPose {
  const t = Math.max(0, Math.min(1, progress)), wave = Math.sin(Math.PI * t)
  const pose: CharacterPose = { lean: form==='knight'?-0.055:form==='rook'?0.035:0, twist: form==='queen'?-0.10:form==='bishop'?0.06:form==='pawn'?-0.055:0,
    leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, draw: 0, slash: 0, guard: 0, pulse: 0, scale: 1, cape: 0,
    swing: 0, thrust: 0, cast: 0, crouch: form==='rook'?0.022:form==='knight'?0.012:0, head: 0, hip: form==='queen'?0.014:form==='pawn'?-0.006:0, bladeTurn: 0 }
  if (cue === 'death') { pose.lean = 0.7 * Math.min(1, t * 2); pose.scale = 1 - 0.05 * Math.min(1, t * 2) }
  if (cue === 'transform' || cue === 'revert') { pose.scale = 1 - wave * 0.07; pose.pulse = wave }
  if (cue === 'move') {
    const stride = Math.sin(t * Math.PI * 4) * (form === 'bishop' ? 0.12 : form === 'rook' ? 0.23 : 0.34)
    pose.leftLeg = stride; pose.rightLeg = -stride; pose.leftArm = -stride * 0.5; pose.rightArm = stride * 0.4
    pose.lean = form === 'knight' ? -0.12 : form === 'rook' ? 0.025 : -0.04; pose.cape = Math.sin(t * Math.PI * 3) * 0.08
  }
  if (cue === 'attack' || cue === 'counter') {
    const impact = cue==='counter' ? 0.34 : characterTiming[form].impact / characterTiming[form].basic
    pose.swing = envelope(t,0,impact*0.65,impact) * -0.5 + envelope(t,impact*0.65,impact,0.88)
    pose.slash = envelope(t,impact-0.07,impact,impact+0.18)
    if (form === 'pawn') {
      // Reach, withdraw along the scabbard, cut rapidly, return, seat the blade.
      // Fully seated at 397ms, before the authoritative 430ms Sharpener feedback.
      pose.draw = ramp(t,0.12,0.255)*(1-ramp(t,0.43,0.64))
      pose.bladeTurn=ramp(t,0.255,0.274)*(1-ramp(t,0.37,0.43))
      pose.rightArm = -0.45 * pose.draw; pose.twist = -0.18*envelope(t,0,0.16,0.26)+0.24*envelope(t,0.24,0.32,0.64)
      pose.crouch = 0.025 * envelope(t,0,0.15,0.6)
    } else if (form === 'knight') { pose.thrust=envelope(t,0.22,impact,0.76); pose.lean=-0.10*pose.thrust }
    else if (form === 'bishop') { pose.cast=envelope(t,0.04,impact,0.84); pose.pulse=pose.cast; pose.head=-0.06*pose.cast }
    else if (form === 'rook' || form==='king') { pose.twist=pose.swing*(form==='king'?0.32:0.23); pose.crouch=0.035*wave; pose.lean=-0.055*pose.swing }
    else { pose.leftArm=-0.32*wave; pose.twist=pose.swing*0.32; pose.hip=-0.02*pose.swing }
  }
  if (cue === 'signature') {
    pose.pulse = wave
    if (form === 'pawn') { pose.guard = 1; pose.crouch=0.025*wave; pose.rightArm = -0.7 }
    if (form === 'knight') { pose.thrust=envelope(t,0.54,440/characterTiming.knight.signature,0.96); pose.lean=-0.14*wave }
    if (form === 'bishop') { pose.cast=wave; pose.head=-0.08*wave }
    if (form === 'rook') { pose.guard = 1; pose.leftArm = -0.55; pose.rightArm = -0.6 }
    if (form === 'queen') { pose.swing=envelope(t,0.1,0.375,0.85); pose.slash=pose.swing; pose.leftArm=-0.5*wave; pose.twist=wave*0.28 }
    if (form === 'king') { pose.guard=1; pose.crouch=0.045*wave; pose.swing=-0.25*wave }
  }
  if (cue === 'defend' || cue === 'parry') { pose.guard = 1; pose.draw = form === 'pawn' ? wave : 0; pose.bladeTurn=form==='pawn'?wave:0; pose.rightArm = -0.65; pose.leftArm = -0.4; pose.lean = wave * 0.04 }
  if (cue === 'hit') { pose.lean = wave * 0.15; pose.twist = -wave * 0.06 }
  if(variant==='dark'&&form==='knight'){pose.lean*=0.5;pose.crouch+=0.008}
  if(variant==='dark'&&form==='queen'){pose.twist*=0.6;pose.crouch+=0.018;pose.hip*=0.5}
  if(form!=='pawn'&&variant==='light'&&cue==='idle'){pose.twist=0;pose.hip=0}
  if(variant==='dark'&&(form==='bishop'||form==='rook'||form==='king')){pose.twist-=0.07;pose.head+=0.025;pose.hip=-0.008;pose.crouch+=0.008}
  if (reduced) { pose.lean = 0; pose.twist = 0; pose.leftLeg = pose.rightLeg = 0; pose.cape = 0; pose.scale = 1; pose.pulse = 0; pose.slash *= 0.2 }
  return pose
}
