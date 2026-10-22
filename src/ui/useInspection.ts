import { useEffect } from 'react'
import { connectInspection, fitInspectionPanels, useInspectionStore } from './inspectionStore'
import { restoreGameFocus } from './hudInteraction'

export function useInspection(enabled: boolean) {
  useEffect(connectInspection, [])
  useEffect(() => {
    if (!enabled) { useInspectionStore.getState().dismiss(); return }
    const fitPanels=()=>fitInspectionPanels(window.innerWidth)
    const disconnect=useInspectionStore.subscribe(fitPanels);fitPanels()
    const outside = (event: PointerEvent) => {
      const target = event.target
      // Canvas clicks are handled after R3F identifies enemy / board / empty space.
      if (target instanceof Element && target.closest('canvas,[data-inspection-root],.keyword-tooltip,.keyword')) return
      const ui=useInspectionStore.getState()
      if (ui.characterOpen || ui.enemyId) { ui.closeCharacter(); ui.closeEnemy() }
    }
    const key = (event: KeyboardEvent) => {
      if (event.key==='Escape' && !document.querySelector('dialog[open]')) {
        const ui=useInspectionStore.getState()
        if(ui.characterOpen||ui.enemyId||ui.aimingAttack){event.preventDefault();ui.dismiss();restoreGameFocus()}
      }
    }
    const toggle = (event: Event) => {
      if (event.target instanceof HTMLDetailsElement && event.target.name==='hud-panels' && event.target.open) useInspectionStore.getState().dismiss()
    }
    window.addEventListener('pointerdown',outside,true);window.addEventListener('keydown',key,true);document.addEventListener('toggle',toggle,true)
    window.addEventListener('resize',fitPanels)
    return () => { disconnect();window.removeEventListener('resize',fitPanels);window.removeEventListener('pointerdown',outside,true);window.removeEventListener('keydown',key,true);document.removeEventListener('toggle',toggle,true) }
  },[enabled])
}
