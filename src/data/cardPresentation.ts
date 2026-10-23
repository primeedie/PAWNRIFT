import { defenseBalance } from './defenseBalance'
import type { CardId } from './cards'
import { cardDefinition, type Rarity } from './cards'
import type { CardTextToken } from './glossary'

export type CardCategory = 'attack' | 'defense' | 'mobility' | 'utility'
export const cardCategories: Record<CardCategory, { label: string; symbol: string }> = {
  attack: { label: 'Attack', symbol: '◇' }, defense: { label: 'Defense', symbol: '⬡' },
  mobility: { label: 'Mobility', symbol: '➜' }, utility: { label: 'Utility', symbol: '✧' },
}
// Explicit tokens avoid matching ordinary words or substrings. No game effects live here.
export const cardPresentation = {
  cut: { category: 'attack', tokens: ['Deal 4 ', { keyword: 'damage', text: 'Damage' }, ' to one adjacent enemy.'] },
  ward: { category: 'defense', tokens: ['Gain 3 ', { keyword: 'block' }, ` for ${defenseBalance.cardWindows} enemy responses.`] },
  riposte: { category: 'defense', tokens: ['Gain 1 ', { keyword: 'block' }, ` for ${defenseBalance.cardWindows} responses. `, { keyword: 'counter', text: 'Counter' }, ' the first hit for 4 ', { keyword: 'damage', text: 'damage' }, ' this response.'] },
  slip: { category: 'mobility', tokens: ['Move 1 clear adjacent tile. Gain 1 ', { keyword: 'block' }, ` for ${defenseBalance.cardWindows} responses.`] },
  focus: { category: 'utility', tokens: ['Gain 1 ', { keyword: 'focus' }, ' (max 3) for your next strike.'] },
  crimson: { category: 'attack', tokens: ['Deal 7 ', { keyword: 'damage', text: 'Damage' }, ' to one adjacent enemy.'] },
  mend: { category: 'utility', tokens: [{ keyword: 'healing', text: 'Heal' }, ' yourself for 4 HP, up to full.'] },
} as const satisfies Record<CardId, { category: CardCategory; tokens: readonly CardTextToken[] }>

// Minimized copy includes every effect; the expanded face retains the full rules/keyword text.
export const cardSummaries: Record<CardId, string> = {
  cut: '4 damage; one adjacent foe.', ward: `3 Block; ${defenseBalance.cardWindows} responses.`,
  riposte: `1 Block (${defenseBalance.cardWindows} responses); counter 4 this response.`, slip: `Step 1; 1 Block for ${defenseBalance.cardWindows} responses.`,
  focus: '+1 Focus (max 3); next strike.', crimson: '7 damage; one adjacent foe.', mend: 'Heal 4 HP (up to full).',
}
export function cardPresentationFor(instance:{definitionId:CardId;rarity?:Rarity}){
  const base=cardPresentation[instance.definitionId]
  if(!instance.rarity||instance.rarity==='common')return base
  const terms={Block:'block',Damage:'damage',damage:'damage',Focus:'focus',Counter:'counter',Heal:'healing'} as const
  const tokens:CardTextToken[]=cardDefinition(instance).description.split(/\b(Block|Damage|damage|Focus|Counter|Heal)\b/).filter(Boolean).map(text=>Object.hasOwn(terms,text)?{keyword:terms[text as keyof typeof terms],text}:text)
  return {category:base.category,tokens}
}
export function cardSummaryFor(instance:{definitionId:CardId;rarity?:Rarity}){
  if(!instance.rarity||instance.rarity==='common')return cardSummaries[instance.definitionId]
  const effect=cardDefinition(instance).effect
  return effect.kind==='damage'?`${effect.amount} damage; one adjacent foe.`:effect.kind==='block'?`${effect.amount} Block; ${defenseBalance.cardWindows} responses.`
    :effect.kind==='counter'?`${effect.block} Block (${defenseBalance.cardWindows} responses); counter ${effect.amount} this response.`
      :effect.kind==='move'?`Step 1; ${effect.block} Block for ${defenseBalance.cardWindows} responses.`:effect.kind==='focus'?`+${effect.amount} Focus (max 3); next strike.`:`Heal ${effect.amount} HP (up to full).`
}
