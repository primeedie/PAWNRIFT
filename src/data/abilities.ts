import type { ChessForm } from './forms'

export const signatureAbilities = {
  pawn: { name: 'Crimson Reversal', icon: '↶', cooldown: 10, summary: 'Enter Samurai Mode. Automatically parry the next 3 eligible attacks. Unused parries expire at floor end.' },
  knight: { name: 'Vaulting Charge', icon: '↗', cooldown: 7, summary: 'L-leap and thrust: Light 5 damage; Dark 3 damage + 3 Block. Choose a legal landing and visible foe within 2 clear straight tiles.' },
  bishop: { name: 'Astral Eye', icon: '◉', cooldown: 0, summary: 'Once per floor, reveal a seeded 4×4 for this response and the next. Light: discovered foes Exposed +2; Dark: one next enemy plan.' },
  rook: { name: 'Iron Bastion', icon: '⬡', cooldown: 9, summary: 'Light: 4 Block + 5 retaliation; Dark: 8 Block + 2 retaliation. Retaliate against the first nearby strike; expires after this response.' },
  king: { name: 'Royal Decree', icon: '♚', cooldown: 8, summary: 'Test King: wind up through one enemy response, then strike visible foes in a 5x5. Light 12/6 inner/outer; Dark 9/4 plus safe knockback. Smite is shared across all targets.' },
  queen: { name: 'Dread Sovereign', icon: '✦', cooldown: 10, summary: 'Visible foes in the surrounding 3×3 take Light 7 / Dark 4 damage. Fear within 3 tiles; Dark weakens the next strike by 1.' },
} as const satisfies Record<ChessForm, { name: string; icon: string; cooldown: number; summary: string }>

// Values not fixed in the brief remain provisional.
export const abilityBalance = { samuraiParries: 3, pawnCounter: 5, lanceDamage: 3, chargeLightBonus: 2, chargeDarkBlock: 3,
  eyeTurns: 2, exposedBonus: 2, exposedTurns: 3, rookLightBlock: 4, rookDarkBlock: 8,
  rookLightRetaliation: 5, rookDarkRetaliation: 2, retaliationRange: 1,
  queenLightDamage: 7, queenDarkDamage: 4, fearRange: 3, queenWeakness: 1 } as const
