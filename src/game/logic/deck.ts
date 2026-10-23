import { cardBalance, starterCards, coreStarterCards, starterPools, starterCopyCap, type CardId, type Rarity } from '../../data/cards'
import { seededRandom } from '../../utils/seededRandom'

export type CardInstance = { instanceId: string; definitionId: CardId;rarity?:Rarity }
export type DeckState = { hand: CardInstance[]; draw: CardInstance[]; discard: CardInstance[]; seed: string; shuffleCount: number;originalStarter?:CardId[] }

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
export function selectStartingCards(master:string):CardId[]{
  const selected=[...coreStarterCards],random=seededRandom(`${master}:starter-selection:v1`)
  for(const pool of starterPools){
    const eligible=pool.filter(id=>selected.filter(card=>card===id).length<starterCopyCap)
    const fallback=[...new Set(starterCards)]
    const choices=eligible.length?eligible:fallback.filter(id=>selected.filter(card=>card===id).length<starterCopyCap)
    selected.push(choices[Math.floor(random()*choices.length)])
  }
  return selected
}
export function createRunDeck(master:string):DeckState{
  const originalStarter=selectStartingCards(master),seed=`${master}:starter-shuffle:v1`
  const instances=originalStarter.map((definitionId,index)=>({definitionId,instanceId:`starter-${index}`,rarity:'common' as const}))
  return {...refillHand({seed,shuffleCount:0,hand:[],discard:[],draw:shuffle(instances,`${seed}:deck:0`)}),originalStarter}
}

// Called only after validated effects. Played cards enter discard before drawing a replacement.
export function discardAndRefill(deck: DeckState, instanceId: string): DeckState {
  const card = deck.hand.find((entry) => entry.instanceId === instanceId)
  if (!card) return deck
  return refillHand({ ...deck, hand: deck.hand.filter((entry) => entry !== card), discard: [...deck.discard, card] })
}
