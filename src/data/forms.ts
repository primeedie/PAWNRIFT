export const bossForms = ['knight', 'bishop', 'rook', 'queen'] as const
export type BossForm = typeof bossForms[number]
export type ChessForm = 'pawn' | BossForm
export type Attunement = 'light' | 'dark'
export const transformationRules = { charges: 5, activeFloors: 2, recoveryFloors: 1, slots: 2 } as const
// Stage 7A.1 basic values are provisional; signatures are configured in abilities.ts.
export const formBalance = {
  lightDamage: 1, darkBlock: 1,
  knight: { slideRange: 0, attackRange: 2, damage: 3 },
  bishop: { slideRange: 3, attackRange: 2, damage: 2 },
  rook: { slideRange: 3, attackRange: 1, damage: 4, basicBlock: 2 },
  queen: { slideRange: 3, attackRange: 1, damage: 3 },
} as const
export const formNames: Record<ChessForm, string> = { pawn: 'Pawn', knight: 'Knight', bishop: 'Bishop', rook: 'Rook', queen: 'Queen' }
export const formSymbols: Record<ChessForm, string> = { pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛' }
