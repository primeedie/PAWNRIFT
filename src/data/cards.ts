import { defenseBalance } from './defenseBalance'
// Stage 6 balance is provisional; deck/hand sizes follow the approved starting configuration.
export const cardBalance = { handSize: 4, maxEnergy: 3, energyPerTurn: 1, maxFocus: 3 } as const
export type CardEffect =
  | { kind: 'damage'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'counter'; block: number; amount: number }
  | { kind: 'move'; block: number }
  | { kind: 'focus'; amount: number }
  | { kind: 'heal'; amount: number }
export type CardDefinition = { name: string; cost: number; description: string; effect: CardEffect }
export const cards = {
  cut: { name: 'Cut', cost: 1, description: 'Deal 4 Damage to one adjacent enemy.', effect: { kind: 'damage', amount: 4 } },
  ward: { name: 'Ward', cost: 1, description: `Gain 3 Block for ${defenseBalance.cardWindows} enemy responses.`, effect: { kind: 'block', amount: 3 } },
  riposte: { name: 'Riposte', cost: 1, description: `Gain 1 Block for ${defenseBalance.cardWindows} responses. Counter the first hit for 4 damage this response.`, effect: { kind: 'counter', block: 1, amount: 4 } },
  slip: { name: 'Slip', cost: 1, description: `Move 1 clear adjacent tile. Gain 1 Block for ${defenseBalance.cardWindows} responses.`, effect: { kind: 'move', block: 1 } },
  focus: { name: 'Focus', cost: 0, description: 'Gain 1 Focus (max 3) for your next strike.', effect: { kind: 'focus', amount: 1 } },
  crimson: { name: 'Crimson', cost: 3, description: 'Deal 7 Damage to one adjacent enemy.', effect: { kind: 'damage', amount: 7 } },
  mend: { name: 'Mend', cost: 2, description: 'Heal yourself for 4 HP, up to full.', effect: { kind: 'heal', amount: 4 } },
} as const satisfies Record<string, CardDefinition>
export type CardId = keyof typeof cards
export const starterCards: readonly CardId[] = ['cut', 'cut', 'cut', 'ward', 'ward', 'riposte', 'riposte', 'slip', 'slip', 'focus', 'crimson', 'mend']
