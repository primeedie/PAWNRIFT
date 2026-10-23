import { useEffect, useRef, useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { pendingChest } from '../game/logic/floorContent'
import { floorToken } from '../game/logic/run'
import { cardDefinition, rarityLabels } from '../data/cards'
import { cardPresentationFor } from '../data/cardPresentation'
import { CardIllustration } from './CardIllustration'
import { CardDescription } from './CardHand'
import { EnergyIcon } from './EnergyIcon'
import { useAppStore } from '../game/state/appStore'
import { restoreGameFocus } from './hudInteraction'

export function TreasureReward(){
  const state=usePawnStore(),chest=pendingChest(state),dialog=useRef<HTMLDialogElement>(null),[deferred,setDeferred]=useState(false)
  const active=!!chest&&!state.training&&state.runActive&&state.status==='playing'&&state.phase==='ready'
  const identity=`${state.progress?.id}:${state.floorContent?.id}:${chest?.id}`
  useEffect(()=>setDeferred(false),[identity])
  useEffect(()=>{
    const element=dialog.current
    if(active&&!deferred&&element){element.showModal();element.querySelector<HTMLElement>('h2')?.focus()}
    return ()=>{if(element?.open)element.close()}
  },[active,deferred,identity])
  if(!active||!chest)return null
  if(deferred)return <button className="pending-treasure" onClick={()=>setDeferred(false)}>Treasure pending · choose or skip to continue</button>
  const token=floorToken(state)
  return <dialog ref={dialog} className="treasure-dialog" aria-labelledby="treasure-heading" onKeyDown={event=>event.stopPropagation()}
    onCancel={event=>{event.preventDefault();setDeferred(true)}} onClick={event=>event.stopPropagation()}>
    <h2 id="treasure-heading" tabIndex={-1}>Choose one card</h2><p>The opening turn has finished. Choosing or skipping costs no additional turn.</p>
    <div className="treasure-choices">{chest.offer.map((offer,index)=>{
      const definition=cardDefinition(offer),presentation=cardPresentationFor(offer)
      return <article className="reward-card" data-rarity={offer.rarity} key={index}>
        <h3>{definition.name}</h3><span className="reward-energy"><EnergyIcon/> {definition.cost} Energy</span>
        <CardIllustration card={offer.definitionId}/><strong className="rarity-label">{rarityLabels[offer.rarity]}</strong>
        <CardDescription tokens={presentation.tokens}/><button onClick={()=>{if(state.claimTreasure(token,chest.id,index))restoreGameFocus()}}>Take {definition.name}</button>
      </article>
    })}</div>
    <div className="treasure-actions"><button onClick={()=>{if(state.claimTreasure(token,chest.id,null))restoreGameFocus()}}>Skip all cards</button>
      <button onClick={()=>setDeferred(true)}>Decide later</button><button onClick={()=>useAppStore.getState().showTitle()}>Return to menu</button></div>
  </dialog>
}
