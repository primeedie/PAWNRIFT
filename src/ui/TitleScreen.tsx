import { useAppStore } from '../game/state/appStore'
import { usePawnStore } from '../game/state/pawnStore'

export function TitleScreen() {
  const play = useAppStore((state) => state.play)
  const newRun = useAppStore((state) => state.newRun)
  const canResume = usePawnStore((state) => state.hasStartedRun && state.status === 'playing' && state.hp > 0)

  return (
    <main className="title-screen">
      <div className="title-content">
        <h1>PAWNRIFT</h1>
        <button className="play-button" onClick={play}>{canResume ? 'Resume' : 'Play'}</button>
        {canResume && <button className="secondary-button new-run-button" onClick={newRun}>New Run</button>}
      </div>
    </main>
  )
}
