import type { CardId } from './cards'
import type { CardTextToken } from './glossary'

export type CardCategory = 'attack' | 'defense' | 'mobility' | 'utility'
export const cardCategories: Record<CardCategory, { label: string; symbol: string }> = {
  attack: { label: 'Attack', symbol: '◇' }, defense: { label: 'Defense', symbol: '⬡' },
  mobility: { label: 'Mobility', symbol: '➜' }, utility: { label: 'Utility', symbol: '✧' },
}
// Explicit tokens avoid matching ordinary words or substrings. No game effects live here.
export const cardPresentation = {
  cut: { category: 'attack', tokens: ['Deal 4 ', { keyword: 'damage', text: 'Damage' }, ' to one adjacent enemy.'] },
  ward: { category: 'defense', tokens: ['Gain 3 ', { keyword: 'block' }, ' for the coming enemy response.'] },
  riposte: { category: 'defense', tokens: ['Gain 1 ', { keyword: 'block' }, '. ', { keyword: 'counter', text: 'Counter' }, ' the first hit for 4 ', { keyword: 'damage', text: 'damage' }, ' this response.'] },
  slip: { category: 'mobility', tokens: ['Move 1 clear adjacent tile. Gain 1 ', { keyword: 'block' }, ' this response.'] },
  focus: { category: 'utility', tokens: ['Gain 1 ', { keyword: 'focus' }, ' (max 3) for your next strike.'] },
  crimson: { category: 'attack', tokens: ['Deal 7 ', { keyword: 'damage', text: 'Damage' }, ' to one adjacent enemy.'] },
  mend: { category: 'utility', tokens: [{ keyword: 'healing', text: 'Heal' }, ' yourself for 4 HP, up to full.'] },
} as const satisfies Record<CardId, { category: CardCategory; tokens: readonly CardTextToken[] }>
