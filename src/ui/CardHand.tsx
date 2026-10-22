import { useEffect, useRef, useState } from 'react'
import { cards } from '../data/cards'
import { cardCategories, cardPresentation, cardSummaries } from '../data/cardPresentation'
import { cardInspection } from './cardInspection'
import { type CardTextToken } from '../data/glossary'
import { cardOptions } from '../game/logic/cardRules'
import { usePawnStore } from '../game/state/pawnStore'
import { EnergyIcon } from './EnergyIcon'
import { KeywordTooltip } from './KeywordTooltip'
import { CardIllustration } from './CardIllustration'
import { restoreGameFocus } from './hudInteraction'
import { tutorialStep } from '../game/logic/tutorial'

function emphasizeValues(text: string) {
  return text.split(/(\b\d+\b)/g).map((part, index) => /^\d+$/.test(part) ? <strong key={index}>{part}</strong> : part)
}

export function CardDescription({ tokens }: { tokens: readonly CardTextToken[] }) {
  return <p className="card-description">{tokens.map((token, index) => typeof token === 'string' ? <span key={index}>{emphasizeValues(token)}</span>
    : <KeywordTooltip key={index} topic={token.keyword}>{token.text}</KeywordTooltip>)}</p>
}

export function CardHand() {
  const state = usePawnStore()
  const [inspection, setInspection] = useState<{ id: string; position: ReturnType<typeof cardInspection> }>()
  const inspectMode = useRef('pointer'), root = useRef<HTMLElement>(null)
  const inspect = (element: HTMLElement, id: string, mode: string) => {
    inspectMode.current = mode
    setInspection({ id, position: cardInspection(element.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }) })
    state.observeTutorialUI({kind:'card-inspected',id})
  }
  useEffect(() => {
    const close = () => setInspection(undefined)
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !(event.target instanceof Element && event.target.closest('.keyword-tooltip'))) close() }
    window.addEventListener('resize', close); window.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('resize', close); window.removeEventListener('pointerdown', outside) }
  }, [])
  useEffect(() => {
    if (!inspection) return
    const outside = (event: Event) => {
      if (event.type==='pointermove' && inspectMode.current!=='pointer') return
      if (!(event.target instanceof Element && event.target.closest('.hand-card,.keyword-tooltip'))) setInspection(undefined)
    }
    window.addEventListener('pointermove',outside);window.addEventListener('focusin',outside)
    return () => {window.removeEventListener('pointermove',outside);window.removeEventListener('focusin',outside)}
  },[inspection?.id])
  useEffect(() => setInspection(undefined), [state.dungeon, state.training?.id, state.phase])
  const selected = state.deck.hand.find((card) => card.instanceId === state.selectedCardId)
  const options = selected ? cardOptions(state, selected.instanceId) : undefined
  const locked = !state.runActive || state.phase !== 'ready' || state.status !== 'playing'
  // Floor resets/menu remounts discard presentation-only tooltips without touching game state.
  return <>
    <section ref={root} className="card-hand" aria-label="Card hand" onKeyDown={(event) => {
      event.stopPropagation()
      if (event.key === 'Escape') { setInspection(undefined); state.selectCard(undefined); restoreGameFocus() }
    }}>
      <div className="hand-meta" data-tooltip-avoid>
        <div className="hand-resources">
          <KeywordTooltip topic="energy" className="energy-total"><EnergyIcon /><span>ENERGY <strong>{state.energy}/{state.maxEnergy}</strong></span></KeywordTooltip>
          <span><KeywordTooltip topic="draw" /> {state.deck.draw.length}</span>
          <span><KeywordTooltip topic="discard" /> {state.deck.discard.length}</span>
          <span><KeywordTooltip topic="focus" /> {state.focus}</span>
          <KeywordTooltip topic="guide" className="help-trigger" />
        </div>
        <div className="card-targeting" role="status">
          {selected && <>
            <span>{options?.reason ?? (options?.targets[0]?.kind === 'self' ? cards[selected.definitionId].name : 'Choose a highlighted target')}</span>
            {options?.targets[0]?.kind === 'self' && <button disabled={locked} onClick={() => state.playSelectedCard({ kind: 'self' })}>Play</button>}
            <button onClick={() => { state.selectCard(undefined); restoreGameFocus() }} title="Cancel targeting (Escape)">Cancel</button>
          </>}
        </div>
      </div>
      <div className="hand-cards" role="group" aria-label="Playing cards. Scroll horizontally for more cards." tabIndex={0} onScroll={() => setInspection(undefined)}>
        {state.deck.hand.map((instance) => {
          const card = cards[instance.definitionId]
          const presentation = cardPresentation[instance.definitionId]
          const category = cardCategories[presentation.category]
          const reason = cardOptions(state, instance.instanceId).reason
          const shortfall = card.cost - state.energy
          const energyHelp = shortfall > 0
            ? `Costs ${card.cost} Energy; you have ${state.energy}. You need ${shortfall} more. A basic move, attack, defend, or wait restores 1 after enemies respond.`
            : `Costs ${card.cost} Energy, paid before the effect. Playing a valid card advances the world once.`
          return <article key={instance.instanceId} className="hand-card" data-category={presentation.category}
            data-tutorial-focus={!!state.tutorial&&tutorialStep(state.tutorial).card===instance.definitionId}
            data-tooltip-avoid
            data-inspected={inspection?.id === instance.instanceId}
            onPointerEnter={(event) => { if (event.pointerType === 'mouse') inspect(event.currentTarget, instance.instanceId, 'pointer') }}
            onPointerLeave={(event) => { if (inspectMode.current === 'pointer' && !(event.relatedTarget instanceof Element && event.relatedTarget.closest('.keyword-tooltip'))) setInspection(undefined) }}
            onPointerDown={(event) => { if (event.pointerType === 'touch') inspect(event.currentTarget, instance.instanceId, 'touch') }}
            onFocusCapture={(event) => { if (event.target.matches(':focus-visible')) inspect(event.currentTarget, instance.instanceId, 'focus') }}
            onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !(event.relatedTarget instanceof Element && event.relatedTarget.closest('.keyword-tooltip'))) setInspection(undefined) }}
            data-playable={!locked && !reason} data-selected={state.selectedCardId === instance.instanceId}
            data-locked={locked} onClick={() => { if (!locked) state.selectCard(instance.instanceId) }}>
            <div className="card-face" data-tooltip-avoid style={inspection?.id === instance.instanceId ? inspection.position : undefined}>
            <button type="button" className="card-select" disabled={locked} aria-pressed={state.selectedCardId === instance.instanceId}
              aria-label={`Inspect ${card.name}. ${category.label}. ${card.cost} Energy. ${card.description}${reason ? ` ${reason}.` : ''}`}
              onClick={(event) => { event.stopPropagation(); state.selectCard(instance.instanceId) }}>
              <strong className="card-name">{card.name}</strong>
            </button>
            <KeywordTooltip topic="energy" className={`card-cost ${shortfall > 0 ? 'unaffordable' : ''}`} extra={energyHelp}>
              <EnergyIcon /><strong>{card.cost}</strong>
            </KeywordTooltip>
            <CardIllustration card={instance.definitionId} />
            <span className="card-category"><span aria-hidden="true">{category.symbol}</span> {category.label}</span>
            <p className="card-summary">{emphasizeValues(cardSummaries[instance.definitionId])}</p>
            <CardDescription tokens={presentation.tokens} />
            {shortfall > 0 && <span className="card-unavailable">Need {shortfall} more Energy</span>}
            </div>
          </article>
        })}
      </div>
    </section>
  </>
}
