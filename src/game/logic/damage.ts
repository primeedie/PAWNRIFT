import { abilityBalance } from '../../data/abilities'
import type { Enemy } from './combat'
import type { DamageInput } from './combatAnalysis'

export function cloneEnemy(enemy: Enemy): Enemy {
  return { ...enemy, bleed: enemy.bleed?.map((stack) => ({ ...stack })), burn: enemy.burn && { ...enemy.burn } }
}
export function clearDeadStatuses(enemy: Enemy) {
  if (enemy.hp > 0) return
  enemy.burn = undefined; enemy.bleed = undefined; enemy.concussion = undefined
  enemy.stunImmunity = 0; enemy.stunned = false; enemy.exposedTurns = 0
  enemy.fearTurns = 0; enemy.weakenedDamage = 0
}

// One logical attack may have several presentation impacts. Flat defense is paid once;
// remaining Block is consumed in order. Follow-ups never hit an already defeated target.
export function damageAttack(enemy: Enemy, components: readonly number[], options: { penetration?: number; direct?: boolean; inputs?: DamageInput[] } = {}) {
  const defense = Math.max(0, enemy.defense ?? 0)
  const ignored = Math.floor(defense * (options.penetration ?? 0))
  let mitigation = defense - ignored
  const exposed = options.direct !== false && (enemy.exposedTurns ?? 0) > 0 ? abilityBalance.exposedBonus : 0
  if (options.direct !== false) enemy.exposedTurns = 0
  const impacts: { damage: number; blocked: number; penetrated: number; breakdown: import('./combatAnalysis').DamageBreakdown }[] = []
  for (const [index, raw] of components.entries()) {
    if (enemy.hp <= 0) break
    const amount = Math.max(0, raw + (index === 0 ? exposed : 0))
    const reduced = Math.min(mitigation, amount)
    mitigation -= reduced
    const afterDefense = amount - reduced
    const blocked = Math.min(Math.max(0, enemy.block ?? 0), afterDefense)
    if (enemy.block !== undefined) enemy.block -= blocked
    const oldHP = enemy.hp
    const damage = Math.min(oldHP, afterDefense - blocked)
    enemy.hp -= damage
    const input = options.inputs?.[index] ?? { source: 'Direct impact', category: 'basic' as const, base: raw }
    // Attribute additive passive damage last, after non-passive damage, mitigation and HP clamping.
    const nonPassiveAfter = Math.max(0, amount - (input.passive ?? 0) - reduced - blocked)
    const passiveAfter = Math.max(0, afterDefense - blocked - nonPassiveAfter)
    const passiveHP = Math.min(passiveAfter, Math.max(0, oldHP - nonPassiveAfter))
    let stackMitigation = reduced + blocked, stackHP = damage
    const stackDamage = input.dotStacks?.map((stack) => {
      const absorbed = Math.min(stackMitigation, stack.raw); stackMitigation -= absorbed
      const hpDamage = Math.min(stackHP, stack.raw - absorbed); stackHP -= hpDamage
      return { ...stack, hpDamage }
    })
    impacts.push({ damage, blocked, penetrated: index === 0 ? ignored : 0, breakdown: { ...input,
      exposed: index === 0 ? exposed : 0, defense: reduced, penetration: index === 0 ? ignored : 0,
      blocked, hpDamage: damage, stackDamage, overkill: afterDefense - blocked - damage, passiveHP } })
  }
  clearDeadStatuses(enemy)
  return impacts
}
export function damageEnemy(enemy: Enemy, amount: number) {
  return damageAttack(enemy, [amount])[0]?.damage ?? 0
}
