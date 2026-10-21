import { cards } from '../data/cards'
import { cardOptions } from '../game/logic/cardRules'
import { usePawnStore } from '../game/state/pawnStore'

export function CardHand() {
  const state = usePawnStore()
  const selected = state.deck.hand.find((card) => card.instanceId === state.selectedCardId)
  const options = selected ? cardOptions(state, selected.instanceId) : undefined
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  return <section className="card-hand" aria-label="Card hand">
    <div className="hand-meta">
      <span>ENERGY <strong>{state.energy}/{state.maxEnergy}</strong> · Draw {state.deck.draw.length} · Discard {state.deck.discard.length} · Focus {state.focus}</span>
      <div className="card-targeting" role="status">
        {selected && <>
          <span>{options?.reason ?? (options?.targets[0]?.kind === 'self' ? cards[selected.definitionId].name : 'Choose a highlighted target')}</span>
          {options?.targets[0]?.kind === 'self' && <button disabled={locked} onClick={() => state.playSelectedCard({ kind: 'self' })}>Play</button>}
          <button onClick={() => state.selectCard(undefined)} title="Cancel targeting (Escape)">Cancel</button>
        </>}
      </div>
    </div>
    <div className="hand-cards">
      {state.deck.hand.map((instance) => {
        const card = cards[instance.definitionId]
        const reason = cardOptions(state, instance.instanceId).reason
        return <button key={instance.instanceId} className="hand-card" disabled={locked}
          data-playable={!locked && !reason} aria-pressed={state.selectedCardId === instance.instanceId}
          title={`${card.name}: ${card.description}${reason ? ` (${reason})` : ''}`}
          onClick={() => state.selectCard(instance.instanceId)}>
          <span className="card-heading"><strong>{card.name}</strong><span className="card-cost" aria-label={`${card.cost} energy`}>{card.cost}</span></span>
          <span className="card-description">{card.description}</span>
        </button>
      })}
    </div>
  </section>
}
