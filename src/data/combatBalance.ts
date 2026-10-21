// Stage 5 provisional balance. Basic actions never require a dice roll.
export const combatBalance = {
  playerMaxHp: 12,
  playerDamage: 3,
  guardReduction: 2,
  counterDamage: 2,
  enemyMaxHp: 6,
  enemyDamage: 2,
  detectionRadius: 4,
  searchTurns: 2,
} as const

// Presentation timing only; rules advance through explicit actions, never elapsed time.
export const turnTiming = { playerMs: 240, enemyMs: 220 } as const
