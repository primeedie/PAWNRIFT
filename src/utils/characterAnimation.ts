import { characterTiming, type CharacterForm } from '../data/characterDesigns'
import type { GameState } from '../game/logic/combat'

export type AnimationCue = 'idle' | 'move' | 'attack' | 'signature' | 'defend' | 'parry' | 'counter' | 'hit' | 'transform' | 'revert' | 'death'
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
  const form: CharacterForm = state.transformations.active?.form === 'king' ? 'pawn' : state.transformations.active?.form ?? 'pawn'
  const timing = characterTiming[form]
  if (state.lastAction === 'transform' || state.lastAction === 'revert') return 340
  if (state.events.some((event) => event.effect === 'sharpener')) return 620
  if (state.lastAction === 'move') return timing.move
  if (state.lastAction === 'attack') return timing.basic
  if (state.lastAction === 'ability') return timing.signature
  return 300
}
export type CharacterPose = { lean: number; twist: number; leftArm: number; rightArm: number; leftLeg: number; rightLeg: number;
  draw: number; slash: number; guard: number; pulse: number; scale: number; cape: number }
export function characterPose(form: CharacterForm, cue: AnimationCue, progress: number, reduced = false): CharacterPose {
  const t = Math.max(0, Math.min(1, progress)), wave = Math.sin(Math.PI * t)
  const pose: CharacterPose = { lean: 0, twist: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, draw: 0, slash: 0, guard: 0, pulse: 0, scale: 1, cape: 0 }
  if (cue === 'death') { pose.lean = 0.7 * Math.min(1, t * 2); pose.scale = 1 - 0.05 * Math.min(1, t * 2) }
  if (cue === 'transform' || cue === 'revert') { pose.scale = 1 - wave * 0.07; pose.pulse = wave }
  if (cue === 'move') {
    const stride = Math.sin(t * Math.PI * 4) * (form === 'bishop' ? 0.08 : form === 'rook' ? 0.18 : 0.3)
    pose.leftLeg = stride; pose.rightLeg = -stride; pose.leftArm = -stride * 0.5; pose.rightArm = stride * 0.4
    pose.lean = form === 'knight' ? -0.12 : form === 'rook' ? 0.025 : -0.04; pose.cape = Math.sin(t * Math.PI * 3) * 0.08
  }
  if (cue === 'attack' || cue === 'counter') {
    pose.slash = wave * (cue === 'counter' ? 1.1 : 1)
    if (form === 'pawn') {
      pose.draw = t < 0.12 ? 0 : t < 0.22 ? (t - 0.12) / 0.10 : t < 0.36 ? 1 : Math.max(0, (0.60 - t) / 0.24)
      pose.rightArm = -0.45 * pose.draw; pose.twist = Math.sin(t * Math.PI * 2) * 0.15
      pose.slash = t > 0.22 && t < 0.4 ? Math.sin((t - 0.22) / 0.18 * Math.PI) : 0
    } else if (form === 'knight') { pose.rightArm = -0.55 * wave; pose.lean = -0.08 * wave }
    else if (form === 'bishop') { pose.leftArm = -0.8 * wave; pose.pulse = wave }
    else if (form === 'rook') { pose.rightArm = -(t < 0.40 ? t / 0.40 : Math.max(0, (0.85 - t) / 0.45)) * 1.25; pose.lean = wave * 0.08 }
    else { pose.leftArm = -0.65 * wave; pose.rightArm = -0.8 * Math.sin(Math.PI * Math.min(1, t * 1.3)); pose.twist = wave * 0.18 }
  }
  if (cue === 'signature') {
    pose.pulse = wave
    if (form === 'pawn') { pose.guard = 1; pose.draw = 0.35; pose.rightArm = -0.7 }
    if (form === 'knight') { pose.rightArm = -0.6 * Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.55) / 0.45))); pose.lean = -0.14 * wave }
    if (form === 'bishop') { pose.leftArm = -1.1 * wave; pose.rightArm = -0.2 * wave }
    if (form === 'rook') { pose.guard = 1; pose.leftArm = -0.55; pose.rightArm = -0.6 }
    if (form === 'queen') { pose.leftArm = -0.5 * wave; pose.rightArm = -0.5 * wave; pose.twist = wave * 0.18 }
  }
  if (cue === 'defend' || cue === 'parry') { pose.guard = 1; pose.draw = form === 'pawn' ? 0.45 : 0; pose.rightArm = -0.65; pose.leftArm = -0.4; pose.lean = wave * 0.04 }
  if (cue === 'hit') { pose.lean = wave * 0.15; pose.twist = -wave * 0.06 }
  if (reduced) { pose.lean = 0; pose.twist = 0; pose.leftLeg = pose.rightLeg = 0; pose.cape = 0; pose.scale = 1; pose.pulse = 0; pose.slash *= 0.2 }
  return pose
}
