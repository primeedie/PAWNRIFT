import { useEffect, useRef, useState } from 'react'
import { usePawnStore } from '../game/state/pawnStore'
import { tutorials, tutorialLesson } from '../data/tutorials'
import { tutorialStep } from '../game/logic/tutorial'
import { currentForm } from '../game/logic/transformations'
import { bossForms, formNames, type Attunement } from '../data/forms'
import { combatPassives } from '../data/passives'
import { characterDesigns } from '../data/characterDesigns'
import { useInspectionStore } from './inspectionStore'
import { MovementGuide } from './MovementGuide'
import { AttackGuide } from './AttackGuide'
import { KeywordTooltip } from './KeywordTooltip'
import { TutorialLibrary } from './TutorialLibrary'
import { exitTutorial } from './tutorialNavigation'
import { restoreGameFocus } from './hudInteraction'

export function TutorialPanel(){
  const state=usePawnStore(),session=state.tutorial
  const [library,setLibrary]=useState(false),panel=useRef<HTMLDetailsElement>(null)
  const enemyOpen=useInspectionStore(ui=>!!ui.enemyId)
  useEffect(()=>{setLibrary(false);if(panel.current)panel.current.open=true;restoreGameFocus()},[session?.id,session?.step])
  useEffect(()=>{if(session?.exitRequested&&panel.current){panel.current.open=true;panel.current.querySelector<HTMLElement>('.tutorial-exit-request button')?.focus()}},[session?.exitRequested])
  if(!session)return null
  const lesson=tutorialLesson(session.lesson),step=tutorialStep(session),form=currentForm(state.transformations)
  const locked=state.phase!=='ready',last=session.step===lesson.steps.length-1
  const next=()=>{state.nextTutorialStep();restoreGameFocus()}
  return <details ref={panel} open className="tutorial-panel" data-inspection-root data-tooltip-avoid
    data-enemy-inspection={enemyOpen} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
    onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();state.requestTutorialExit(!session.exitRequested)}}}>
    <summary><span>{lesson.title}</span><span>{session.done?'✓ ':''}{session.step+1}/{lesson.steps.length}</span></summary>
    <div className="tutorial-body">
      <p className="tutorial-safety">Isolated practice · setups may reset; your run is preserved.</p>
      <h2>{session.finished?'Practice finished':step.title}</h2>
      {!session.finished&&<>
        <p id="tutorial-instruction" aria-live="polite">{step.instruction}</p>
        {step.diagram&&<details className="tutorial-diagram"><summary>5×5 rule diagram</summary>
          {step.diagram==='movement'?<MovementGuide form={form} blocked={step.fixture==='obstacle'?[{column:3,row:2}]:[]}/>:<AttackGuide form={form}/>}</details>}
        {session.lesson==='forms'&&<fieldset disabled={locked}>
          <legend>Optional form practice</legend><label>Form<select value={session.form} onChange={event=>state.chooseTutorialForm(event.target.value as typeof session.form,session.attunement)}>
            {bossForms.map(form=><option key={form} value={form}>{formNames[form]}</option>)}
          </select></label><label>Attunement<select value={session.attunement} onChange={event=>state.chooseTutorialForm(session.form,event.target.value as Attunement)}>
            <option value="light">Light · Hallowed</option><option value="dark">Dark · Void</option>
          </select></label><p>{characterDesigns[session.form][session.attunement]}</p>
          <details><summary>{combatPassives[session.form].name}</summary><p>{combatPassives[session.form].summary}</p></details>
        </fieldset>}
        <details className="tutorial-hint"><summary>Hint / rules</summary><p>{step.hint}</p>
          <div className="tutorial-topics">{step.topics?.map(topic=><KeywordTooltip key={topic} topic={topic}/>)}</div>
        </details>
        {session.paid&&<p className="tutorial-observation">Energy {session.paid.before} → {session.paid.after} paid · now {state.energy}/{state.maxEnergy}</p>}
        <p className="tutorial-result" role="status">{state.status==='defeat'?'Practice ended. Retry restores this exercise; your run is safe.':session.message}</p>
        <div className="tutorial-buttons">
          <button disabled={!session.done||locked} onClick={next}>{last?(session.sequence&&tutorials.at(-1)?.id!==session.lesson?'Next lesson':'Finish lesson'):'Continue'}</button>
          <button onClick={()=>{state.retryTutorialStep();restoreGameFocus()}}>Retry exercise</button>
          <button onClick={exitTutorial}>Exit tutorial</button>
        </div>
      </>}
      {session.finished&&<p>Replay any lesson or return to where you left off. Completion never gates gameplay.</p>}
      <details className="tutorial-options"><summary>Skip / choose lesson</summary><div className="tutorial-buttons">
        {!session.finished&&<><button disabled={locked} onClick={()=>{state.nextTutorialStep(true);restoreGameFocus()}}>Skip exercise</button>
          <button disabled={locked} onClick={()=>{const next=tutorials[tutorials.findIndex(entry=>entry.id===session.lesson)+1];if(session.sequence&&next)state.enterTutorial(next.id,true);else setLibrary(true)}}>Skip lesson</button></>}
        <button onClick={()=>setLibrary(!library)}>{library?'Close lessons':'Choose lesson'}</button>
      </div></details>
      {session.finished&&<button onClick={exitTutorial}>Exit tutorial</button>}
      {library&&<TutorialLibrary/>}
      {session.exitRequested&&<div className="tutorial-exit-request" role="group" aria-label="Exit tutorial?">
        <p>Return to your previous session?</p><button onClick={exitTutorial}>Exit and restore</button>
        <button onClick={()=>{state.requestTutorialExit(false);restoreGameFocus()}}>Keep practicing</button>
      </div>}
    </div>
  </details>
}
