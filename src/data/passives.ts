import type { ChessForm } from './forms'

export const passiveBalance = {
  sharpenerCap: 5, sharpenerSkillCap: 3, penetration: 0.10,
  splashDamage: 1, splashTargets: 2, burnDamage: 1, burnTurns: 2,
  bleedDamage: 2, bleedTurns: 3, bleedCap: 3,
  concussionDelay: { normal: 1, elite: 2, boss: 3 },
  stunImmunity: { normal: 2, elite: 3, boss: 5 },
  smiteGain: 2, smiteCap: 10, kingPushEvery: 3,
  // King test-preview values not fixed by the brief remain provisional.
  kingPoise: 1, decreeLightInner: 12, decreeLightOuter: 6, decreeDarkInner: 9, decreeDarkOuter: 4,
  iaiMs: 620, mainHitMs: 170, followupMs: 430,
} as const

export const combatPassives = {
  pawn: { name: 'Sharpener', icon: '◆', summary: 'Basics gain 1 stack after striking (max 5). Existing stacks deal a separate follow-up. Damaging cards and Crimson Reversal gain up to 3. Resets each floor.' },
  knight: { name: 'Sky Piercer', icon: '↗', summary: 'Orthogonal reach 2; clear lane required. Basics ignore 10% of defense, rounded down. Block still absorbs damage.' },
  bishop: { name: 'Swish', icon: '◈', summary: 'Basic: splash 1 to up to 2 visible neighbors of the victim. Opposite checker color burns the victim for 1 on each of the next 2 responses.' },
  rook: { name: 'Stun Strike', icon: '⬡', summary: 'Basics apply one Concussion countdown. Normal/elite/boss respond 1/2/3 times, then skip once and resist reapplication for 2/3/5 turns. Hits never reset it.' },
  queen: { name: 'Severance', icon: '✦', summary: 'Basics add one Bleed (max 3). Each independently deals 2 on the next 3 turns. Full stacks never refresh. Signatures do not add Bleed.' },
  king: { name: 'Smite', icon: '♚', summary: 'Test King: offensive actions gain +2, capped +10, before damage. Share that bonus across targets/hits once per action. Every third basic can push one tile. Poise reduces the first direct hit by 1.' },
} as const satisfies Record<ChessForm, { name: string; icon: string; summary: string }>
