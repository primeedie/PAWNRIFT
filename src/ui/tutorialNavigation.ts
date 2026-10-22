import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'
import { useTutorialProgress } from '../game/state/tutorialProgress'
import type { LessonId } from '../data/tutorials'
import { useInspectionStore } from './inspectionStore'
import { closeHudPanels, restoreGameFocus } from './hudInteraction'

let previous:{screen:'title'|'scene';inspection:Pick<ReturnType<typeof useInspectionStore.getState>,'characterOpen'|'enemyId'|'aimingAttack'|'lastPanel'>}|undefined
export function startTutorial(lesson:LessonId='movement',sequence=false){
  if(!usePawnStore.getState().tutorial){
    const {characterOpen,enemyId,aimingAttack,lastPanel}=useInspectionStore.getState()
    previous={screen:useAppStore.getState().screen,inspection:{characterOpen,enemyId,aimingAttack,lastPanel}}
  }
  if(!usePawnStore.getState().enterTutorial(lesson,sequence))return false
  useTutorialProgress.getState().dismissPrompt()
  if(typeof document!=='undefined')closeHudPanels(false)
  useInspectionStore.getState().dismiss()
  useAppStore.setState({screen:'scene'})
  return true
}
export function exitTutorial(){
  if(!usePawnStore.getState().exitTutorial())return false
  const restore=previous;previous=undefined
  if(restore){useAppStore.setState({screen:restore.screen});useInspectionStore.setState(restore.inspection)}
  if(typeof document!=='undefined')restoreGameFocus()
  return true
}
