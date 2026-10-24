import type { CombatEvent } from '../game/logic/combat'

// Optional, gesture-unlocked synthesized cues; no files, music or rule callbacks.
let context: AudioContext | undefined
let enabled = false
export async function setCombatAudio(value: boolean) {
  if (!value) { enabled = false; return true }
  if (typeof window === 'undefined' || !window.AudioContext) return false
  try { context ??= new window.AudioContext(); await context.resume(); enabled = true; return true }
  catch { return false }
}
export function combatAudioEnabled() { return enabled }
export function playCombatCue(event: CombatEvent) {
  if (!enabled || !context || context.state !== 'running' || !event.seen) return
  const frequencies: Partial<Record<CombatEvent['kind'], number>> = { windup: 220, hit: 110, guard: 330, parry: 660, phase: 165, defeat: 82 }
  const frequency = event.kind === 'hit' && !event.amount ? 330 : frequencies[event.kind]
  if (!frequency) return
  const oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + Math.min(1000,event.delayMs??0)/1000
  oscillator.type = event.kind === 'parry' ? 'sine' : 'triangle'
  oscillator.frequency.setValueAtTime(frequency,start); oscillator.frequency.exponentialRampToValueAtTime(frequency*0.72,start+0.09)
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(0.025,start+0.005);gain.gain.exponentialRampToValueAtTime(0.0001,start+0.10)
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+0.11)
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
}
