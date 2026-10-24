import { useEffect, useRef } from 'react'
import { useInteractionStore, confirmExit, cancelExit } from './interactionStore'
import { restoreGameFocus } from './hudInteraction'
export function exitDialogKey(event:Pick<KeyboardEvent,'key'|'repeat'|'preventDefault'|'stopPropagation'>){
  event.stopPropagation()
  if(event.key==='Enter'){event.preventDefault();if(!event.repeat){confirmExit();restoreGameFocus()}}
  if(event.key==='Escape'){event.preventDefault();cancelExit();restoreGameFocus()}
}

export function ExitConfirmation(){
  const pending=useInteractionStore(state=>state.pending),dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const element=dialog.current
    if(pending&&element){element.showModal();element.querySelector<HTMLButtonElement>('button')?.focus()}
    return ()=>{if(element?.open)element.close()}
  },[pending])
  if(!pending)return null
  const cancel=()=>{cancelExit();restoreGameFocus()}
  const confirm=()=>{confirmExit();restoreGameFocus()}
  return <dialog ref={dialog} className="exit-confirmation" aria-labelledby="exit-confirmation-title"
    onCancel={event=>{event.preventDefault();cancel()}} onKeyDown={exitDialogKey}>
    <h2 id="exit-confirmation-title">{pending.alignment==='light'?'Enter the Hallow?':'Enter the Void?'}</h2>
    <p>Complete this floor and record your exit choice.</p>
    <div><button onClick={confirm}>Enter</button><button onClick={cancel}>Cancel</button></div>
  </dialog>
}
