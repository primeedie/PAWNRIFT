import type { CombatEvent } from './combat'

export type DamageCategory = 'basic' | 'card' | 'signature' | 'counter' | 'passive' | 'dot'
export type DamageInput = { source: string; category: DamageCategory; base: number; passive?: number; focus?: number; attunement?: number; skill?: number; attunementName?: import('../../data/forms').Attunement; dotStacks?: { remaining: number; raw: number }[] }
export type DamageBreakdown = DamageInput & { exposed: number; defense: number; penetration: number; blocked: number; hpDamage: number; overkill: number; passiveHP: number; stackDamage?: { remaining: number; raw: number; hpDamage: number }[] }
export type Analysis = { lastAction: number; actions: number; turns: number; attacks: number; total: number; basic: number; skills: number;
  passive: number; dot: number; blocked: number; overkill: number; received: number; defended: number; history: CombatEvent[] }
export const emptyAnalysis = (): Analysis => ({ lastAction: -1, actions: 0, turns: 0, attacks: 0, total: 0, basic: 0, skills: 0,
  passive: 0, dot: 0, blocked: 0, overkill: 0, received: 0, defended: 0, history: [] })
export function recordAnalysis(analysis: Analysis, events: readonly CombatEvent[], action: number): Analysis {
  if (action <= analysis.lastAction) return analysis
  const next = { ...analysis, lastAction: action, actions: analysis.actions + 1, turns: analysis.turns + 1,
    history: [...analysis.history, ...events.filter((event) => event.seen)].slice(-80) }
  let offensive = false
  for (const event of events) {
    if (event.targetId === 'pawn' && event.kind === 'hit') { next.received += event.amount ?? 0; next.defended += event.blocked ?? 0 }
    const hit = event.breakdown
    if (!hit || event.actor !== 'pawn' || !event.seen) continue
    next.total += hit.hpDamage; next.blocked += hit.blocked; next.overkill += hit.overkill
    next.passive += hit.passiveHP
    if (hit.category === 'basic') next.basic += hit.hpDamage
    if (['card', 'signature', 'counter'].includes(hit.category)) next.skills += hit.hpDamage
    if (hit.category === 'dot') next.dot += hit.hpDamage
    else if (hit.base + (hit.passive ?? 0) + (hit.skill ?? 0) > 0) offensive = true
  }
  if (offensive) next.attacks++
  return next
}
export const damagePerTurn = (analysis: Analysis) => analysis.turns ? analysis.total / analysis.turns : 0
