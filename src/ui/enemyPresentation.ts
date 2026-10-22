import { enemyIntentLabel, type Enemy } from '../game/logic/combat'
export const enemyName = (enemy: Enemy) => enemy.kind === 'dummy' ? 'Dummy' : 'Rookling'
export function enemyStatuses(enemy: Enemy) {
  const entries: { icon: string; label: string; count?: number; tone?: string }[] = []
  if (enemy.intent === 'attack') entries.push({ icon: '!', label: enemyIntentLabel(enemy), tone: 'threat' })
  if (enemy.burn) entries.push({ icon: '♨', label: `Burn: ${enemy.burn.turnsLeft} subsequent ticks`, tone: 'burn' })
  if (enemy.bleed?.length) entries.push({ icon: '◆', count: enemy.bleed.length, label: `Bleed: remaining ticks ${enemy.bleed.map((s) => s.turnsLeft).join(', ')}`, tone: 'bleed' })
  if (enemy.concussion !== undefined) entries.push({ icon: '⬡', label: `Concussion: ${enemy.concussion === 0 ? 'skip next response' : `${enemy.concussion} responses before Stun`}`, tone: 'concussion' })
  if (enemy.stunned) entries.push({ icon: '×', label: 'Stunned: response skipped', tone: 'concussion' })
  if (enemy.stunImmunity) entries.push({ icon: '◇', label: `Stun immunity: ${enemy.stunImmunity} responses` })
  if (enemy.exposedTurns) entries.push({ icon: '◎', label: `Exposed: ${enemy.exposedTurns} responses` })
  if (enemy.fearTurns) entries.push({ icon: '≈', label: `Fear: ${enemy.fearTurns} response` })
  if (enemy.weakenedDamage) entries.push({ icon: '↓', label: `Next strike reduced by ${enemy.weakenedDamage}` })
  return entries
}
