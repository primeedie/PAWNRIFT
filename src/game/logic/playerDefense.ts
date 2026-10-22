import { abilityBalance } from '../../data/abilities'

export type IncomingAttack = { kind:'melee'|'projectile'|'dot'|'environment'; parryable?:boolean; unblockable?:boolean }
export const sparringPatterns=['telegraphed','melee','projectile','unparryable','unblockable','dot','environment'] as const
export type SparringPattern=typeof sparringPatterns[number]
export function sparringAttack(pattern:SparringPattern):IncomingAttack {
  return pattern==='projectile'||pattern==='dot'||pattern==='environment'?{kind:pattern}
    :{kind:'melee',parryable:pattern!=='unparryable',unblockable:pattern==='unblockable'}
}
export const isParryable = (attack:IncomingAttack) => !attack.unblockable && attack.parryable !== false
  && (attack.kind==='melee'||attack.kind==='projectile')

// One mitigation boundary for real enemy strikes and explicitly labeled training samples.
// Neither parry path processes a hit twice; auto-parry has priority over manual protection.
export function defendIncoming(attack:IncomingAttack,options:{raw:number;hp:number;block:number;guard:number;poise:number;charges:number;manual:boolean}) {
  const charges=Math.min(abilityBalance.samuraiParries,Math.max(0,options.charges))
  const automatic=charges>0&&isParryable(attack),manual=!automatic&&options.manual&&isParryable(attack)
  const parried=automatic||manual,direct=attack.kind==='melee'||attack.kind==='projectile'
  const mitigated=parried?0:Math.max(0,options.raw-(direct&&!attack.unblockable?options.guard+options.poise:0))
  const blocked=direct&&!attack.unblockable?Math.min(options.block,mitigated):0
  return {automatic,manual,parried,charges:charges-(automatic?1:0),blocked,damage:Math.min(options.hp,mitigated-blocked),poiseUsed:direct&&!parried&&!attack.unblockable&&options.poise>0}
}
