import { cardBalance, starterCards, type CardId } from '../../data/cards'
import { seededRandom } from '../../utils/seededRandom'

export type CardInstance = { instanceId: string; definitionId: CardId }
export type DeckState = { hand: CardInstance[]; draw: CardInstance[]; discard: CardInstance[]; seed: string; shuffleCount: number }

function shuffle(cards: readonly CardInstance[], seed: string) {
  const result = [...cards], random = seededRandom(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function refillHand(deck: DeckState): DeckState {
  const next = { ...deck, hand: [...deck.hand], draw: [...deck.draw], discard: [...deck.discard] }
  while (next.hand.length < cardBalance.handSize) {
    if (!next.draw.length) {
      if (!next.discard.length) break
      next.draw = shuffle(next.discard, `${next.seed}:deck:${++next.shuffleCount}`)
      next.discard = []
    }
    next.hand.push(next.draw.shift()!)
  }
  return next
}

export function createStarterDeck(seed: string): DeckState {
  const instances = starterCards.map((definitionId, index) => ({ definitionId, instanceId: `starter-${index}` }))
  return refillHand({ seed, shuffleCount: 0, hand: [], discard: [], draw: shuffle(instances, `${seed}:deck:0`) })
}

// Called only after validated effects. Played cards enter discard before drawing a replacement.
export function discardAndRefill(deck: DeckState, instanceId: string): DeckState {
  const card = deck.hand.find((entry) => entry.instanceId === instanceId)
  if (!card) return deck
  return refillHand({ ...deck, hand: deck.hand.filter((entry) => entry !== card), discard: [...deck.discard, card] })
}
