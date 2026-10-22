import { tutorials } from '../data/tutorials'
import { useTutorialProgress } from '../game/state/tutorialProgress'
import { startTutorial } from './tutorialNavigation'

export function TutorialLibrary({close}:{close?:()=>void}){
  const completed=useTutorialProgress(state=>state.completed)
  const start=(id:typeof tutorials[number]['id'],sequence=false)=>{close?.();startTutorial(id,sequence)}
  return <section className="tutorial-library" aria-label="Choose a tutorial lesson">
    <p>Short, optional exercises. Your run and any Training session are preserved. Exit at any time.</p>
    <button onClick={()=>start('movement',true)}>Start beginner sequence</button>
    <ul>{tutorials.map(lesson=><li key={lesson.id}><button onClick={()=>start(lesson.id)}>
      <span aria-hidden="true">{completed.includes(lesson.id)?'✓':'○'}</span> {lesson.title}
      {completed.includes(lesson.id)&&<span className="visually-hidden"> · completed, replay</span>}
    </button></li>)}</ul>
    <small>Checkmarks record practice, never unlocks or rewards.</small>
  </section>
}
