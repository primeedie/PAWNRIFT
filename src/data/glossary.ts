import { cardBalance } from './cards'

export const glossary = {
  energy: { label: 'Energy', explanation: `Spend Energy to play cards. You start with ${cardBalance.maxEnergy}, the maximum. Each completed world turn restores ${cardBalance.energyPerTurn}, after enemies respond; basic moves and attacks restore it too. You must afford the full cost before playing. For example, a 3-cost card leaves 0 immediately, then 1 after the response.` },
  block: { label: 'Block', explanation: 'Protects your HP from incoming damage. Each point absorbs 1 damage and is then spent. With 3 Block, two attacks for 2 damage each deal only 1 total HP damage. Any unused Block disappears after the coming enemy response, even if enemies only move, prepare an attack, or miss. It does not carry into your next action.' },
  focus: { label: 'Focus', explanation: `Each point adds 1 damage to your next basic attack or attack card. It stacks up to ${cardBalance.maxFocus} and lasts until that strike; then all points are used. For example, 2 Focus adds 2 damage. It does not boost counters. You cannot play Focus at the limit.` },
  counter: { label: 'Counter / Riposte', explanation: 'Riposte prepares one return strike for the coming enemy response. The first attack that actually hits your tile triggers it if you survive, even if Block prevents all damage. It deals 4 damage to that attacker. Misses do not trigger it. It expires after that response, used or not. The free Defend action works differently: it reduces damage and counters each real strike.' },
  draw: { label: 'Draw', explanation: `Move cards from the draw pile into your hand. You start with ${cardBalance.handSize} cards. After a valid card play, draw back to ${cardBalance.handSize}; basic actions do not draw. If a draw is needed and that pile is empty, shuffle used cards to refill it. Drawing does not cost an extra world turn.` },
  discard: { label: 'Discard', explanation: 'A played card goes into the discard pile before you draw its replacement. Unplayed cards stay in your hand. When the draw pile runs out and you need a card, the discard pile is shuffled and reused; even the card just played can return. Cards are not destroyed.' },
  damage: { label: 'Damage', explanation: 'Reduces the target’s HP. Attack cards need a visible enemy one tile up, down, left, or right, with no blocking obstacle. Focus adds to a basic attack or attack card. Block absorbs incoming damage first. At 0 HP, an enemy is defeated or your run ends.' },
  healing: { label: 'Healing', explanation: 'Restores your HP immediately, up to your maximum. For example, healing 4 at 10/12 HP restores only 2. Mend cannot be played at full HP. Enemies still respond after you heal; it does not undo that response’s damage.' },
} as const
export type Keyword = keyof typeof glossary
export type CardTextToken = string | { keyword: Keyword; text?: string }
export function plainCardText(tokens: readonly CardTextToken[]) {
  return tokens.map((token) => typeof token === 'string' ? token : token.text ?? glossary[token.keyword].label).join('')
}
