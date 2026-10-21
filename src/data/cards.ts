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
  cut: { name: 'Cut', cost: 1, description: 'Deal 4 to an adjacent foe.', effect: { kind: 'damage', amount: 4 } },
  ward: { name: 'Ward', cost: 1, description: 'Block 3 this response.', effect: { kind: 'block', amount: 3 } },
  riposte: { name: 'Riposte', cost: 1, description: 'Block 1. Counter first strike for 4.', effect: { kind: 'counter', block: 1, amount: 4 } },
  slip: { name: 'Slip', cost: 1, description: 'Step 1 clear tile. Block 1 this response.', effect: { kind: 'move', block: 1 } },
  focus: { name: 'Focus', cost: 0, description: 'Gain 1 Focus (max 3). Next strike +1 per Focus.', effect: { kind: 'focus', amount: 1 } },
  crimson: { name: 'Crimson', cost: 3, description: 'Deal 7 to an adjacent foe.', effect: { kind: 'damage', amount: 7 } },
  mend: { name: 'Mend', cost: 2, description: 'Restore 4 HP.', effect: { kind: 'heal', amount: 4 } },
} as const satisfies Record<string, CardDefinition>
export type CardId = keyof typeof cards
export const starterCards: readonly CardId[] = ['cut', 'cut', 'cut', 'ward', 'ward', 'riposte', 'riposte', 'slip', 'slip', 'focus', 'crimson', 'mend']
