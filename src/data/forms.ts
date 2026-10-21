export const bossForms = ['knight', 'bishop', 'rook', 'queen'] as const
export type BossForm = typeof bossForms[number]
export type ChessForm = 'pawn' | BossForm
export type Attunement = 'light' | 'dark'
export const transformationRules = { charges: 5, activeFloors: 2, recoveryFloors: 1, slots: 2 } as const
// Stage 7A attack/range/ability values are provisional. Cards retain their Stage 6 effects.
export const formBalance = {
  lightDamage: 1, darkBlock: 1, darkAbilityBlock: 2,
  knight: { slideRange: 0, attackRange: 2, damage: 3, abilityCost: 1, abilityDamage: 4 },
  bishop: { slideRange: 3, attackRange: 2, damage: 3, abilityCost: 1, ward: 3, darkWard: 5 },
  rook: { slideRange: 3, attackRange: 1, damage: 4, abilityCost: 1, abilityRange: 3, abilityDamage: 5 },
  queen: { slideRange: 3, attackRange: 1, damage: 3, abilityCost: 2, abilityDamage: 3 },
} as const
export const formNames: Record<ChessForm, string> = { pawn: 'Pawn', knight: 'Knight', bishop: 'Bishop', rook: 'Rook', queen: 'Queen' }
export const formSymbols: Record<ChessForm, string> = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛' }
export const formAbilities = { knight: 'Thrust', bishop: 'Ward', rook: 'Lane strike', queen: 'Twin strike' } as const
