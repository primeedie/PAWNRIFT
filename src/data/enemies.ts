import { combatBalance } from './combatBalance'
import type { Attunement } from './forms'

export const enemyIds = ['initiate', 'halberdier', 'sentinel', 'shield-guard', 'cavalier', 'hallowed-commander', 'chimera-knight'] as const
export type EnemyId = typeof enemyIds[number]
export type AttackPattern = 'cut' | 'thrust' | 'shot' | 'charge' | 'command' | 'twin-strike' | 'lunge' | 'fractured-guard'
export type EnemyDefinition = {
  id: EnemyId; name: string; biome: 'porta'; rank: 'normal' | 'elite' | 'boss'
  variant?: Attunement; role: 'pursuer' | 'reach' | 'ranged' | 'defender' | 'cavalry' | 'commander'
  model: EnemyId; equipment: string; floors: readonly number[]; training: boolean
  patterns: readonly AttackPattern[]; phases: readonly (readonly AttackPattern[])[]
  stats: { hp: number; damage: number; defense: number; detection: number; search: number }
  balance: 'BALANCE_PENDING_USER_DOCUMENT'
  phaseThresholds: readonly {phase:0|1;hpRatio:number}[] | null
  resistances: Partial<Record<'burn'|'bleed'|'concussion'|'stun'|'fear'|'exposed',number>> | null
  scaling: {hp:number;damage:number;defense:number} | null
  rewards: {transformation?:'knight';budget?:number} | null
}

// Functional fixtures ONLY. Retain Stage 5 HP/damage/sight/search for every new rank.
// No boss multiplier, final resistance, automatic HP phase threshold or reward budget.
export const BALANCE_PENDING_USER_DOCUMENT = {
  stats: { hp: combatBalance.enemyMaxHp, damage: combatBalance.enemyDamage, defense: 0,
    detection: combatBalance.detectionRadius, search: combatBalance.searchTurns },
  attacks: {
    cut: { range: 1, recovery: 1, kind: 'melee' },
    thrust: { range: 2, recovery: 1, kind: 'melee' },
    shot: { range: 4, recovery: 1, kind: 'projectile' },
    charge: { range: 4, recovery: 1, kind: 'melee' },
    command: { range: 0, recovery: 1, kind: 'melee' },
    'twin-strike': { range: 1, recovery: 1, kind: 'melee' },
    lunge: { range: 3, recovery: 1, kind: 'melee' },
    'fractured-guard': { range: 0, recovery: 1, kind: 'melee' },
  },
  guard: { amount: combatBalance.guardReduction, windows: 2 },
  phaseRecovery: 1,
  safeSpawnDistance: 3,
  encounters: [['initiate'], ['halberdier', 'sentinel'], ['initiate', 'shield-guard'],
    ['sentinel', 'cavalier'], ['halberdier', 'shield-guard', 'cavalier']] as readonly (readonly EnemyId[])[],
} as const

const define = (id: EnemyId, name: string, role: EnemyDefinition['role'], equipment: string,
  patterns: AttackPattern[], floors: number[], rank: EnemyDefinition['rank'] = 'normal', variant?: Attunement): EnemyDefinition => ({
  id, name, role, equipment, patterns, floors, rank, variant, biome: 'porta', model: id, training: true,
  stats: { ...BALANCE_PENDING_USER_DOCUMENT.stats }, balance: 'BALANCE_PENDING_USER_DOCUMENT',
  phases: [patterns, [...patterns].reverse()], phaseThresholds: null, resistances: null, scaling: null, rewards: null,
})
export const enemies: Record<EnemyId, EnemyDefinition> = {
  initiate: define('initiate', 'Barracks Initiate', 'pursuer', 'infantry sword', ['cut'], [1, 3]),
  halberdier: define('halberdier', 'Halberdier', 'reach', 'halberd', ['thrust'], [2, 5]),
  sentinel: define('sentinel', 'Crossbow Sentinel', 'ranged', 'crossbow', ['shot'], [2, 4]),
  'shield-guard': define('shield-guard', 'Shield Guard', 'defender', 'shield and sword', ['command', 'cut'], [3, 5]),
  cavalier: define('cavalier', 'Elite Cavalier', 'cavalry', 'cavalry spear', ['charge', 'cut'], [4, 5], 'elite'),
  'hallowed-commander': define('hallowed-commander', 'Hallowed Cavalry Commander', 'commander', 'heavy lance',
    ['thrust', 'charge', 'command'], [6], 'boss', 'light'),
  'chimera-knight': define('chimera-knight', 'Void Chimera Knight', 'commander', 'fractured cavalry spear',
    ['twin-strike', 'lunge', 'fractured-guard'], [6], 'boss', 'dark'),
}
export const patternNames: Record<AttackPattern, string> = { cut: 'Committed cut', thrust: 'Consecrated thrust', shot: 'Crossbow shot',
  charge: 'Cavalry charge', command: 'Hallowed command', 'twin-strike': 'Twin-head strike', lunge: 'Void lunge', 'fractured-guard': 'Fractured guard' }
