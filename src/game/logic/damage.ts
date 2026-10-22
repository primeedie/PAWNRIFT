import { abilityBalance } from '../../data/abilities'
import type { Enemy } from './combat'

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
export function damageAttack(enemy: Enemy, components: readonly number[], options: { penetration?: number; direct?: boolean } = {}) {
  const defense = Math.max(0, enemy.defense ?? 0)
  const ignored = Math.floor(defense * (options.penetration ?? 0))
  let mitigation = defense - ignored
  const exposed = options.direct !== false && (enemy.exposedTurns ?? 0) > 0 ? abilityBalance.exposedBonus : 0
  if (options.direct !== false) enemy.exposedTurns = 0
  const impacts: { damage: number; blocked: number; penetrated: number }[] = []
  for (const [index, raw] of components.entries()) {
    if (enemy.hp <= 0) break
    const amount = Math.max(0, raw + (index === 0 ? exposed : 0))
    const reduced = Math.min(mitigation, amount)
    mitigation -= reduced
    const afterDefense = amount - reduced
    const blocked = Math.min(Math.max(0, enemy.block ?? 0), afterDefense)
    if (enemy.block !== undefined) enemy.block -= blocked
    const damage = Math.min(enemy.hp, afterDefense - blocked)
    enemy.hp -= damage
    impacts.push({ damage, blocked, penetrated: index === 0 ? ignored : 0 })
  }
  clearDeadStatuses(enemy)
  return impacts
}
export function damageEnemy(enemy: Enemy, amount: number) {
  return damageAttack(enemy, [amount])[0]?.damage ?? 0
}
