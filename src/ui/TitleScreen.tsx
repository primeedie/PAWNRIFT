import { useAppStore } from '../game/state/appStore'
import { usePawnStore } from '../game/state/pawnStore'
import { useTutorialProgress } from '../game/state/tutorialProgress'
import { startTutorial } from './tutorialNavigation'

export function TitleScreen() {
  const play = useAppStore((state) => state.play)
  const newRun = useAppStore((state) => state.newRun)
  const canResume = usePawnStore((state) => state.hasStartedRun && state.status === 'playing' && state.hp > 0)
  const progress=useTutorialProgress()

  return (
    <main className="title-screen">
      <div className="title-content">
        <h1>PAWNRIFT</h1>
        <button className="play-button" onClick={()=>{progress.dismissPrompt();play()}}>{canResume ? 'Resume' : 'Play'}</button>
        {canResume && <button className="secondary-button new-run-button" onClick={newRun}>New Run</button>}
        {!progress.promptSeen?<section className="tutorial-prompt" aria-label="Optional tutorial">
          <p>New to PAWNRIFT?</p><button onClick={()=>startTutorial('movement',true)}>Start Tutorial</button>
          <button onClick={()=>{progress.dismissPrompt();play()}}>Skip</button>
        </section>:<button className="secondary-button" onClick={()=>startTutorial('movement',true)}>Tutorials</button>}
      </div>
    </main>
  )
}
