import { useEffect, useRef } from 'react'
import { useAppStore } from '../game/state/appStore'
import { usePawnStore } from '../game/state/pawnStore'

export function GameOver() {
  const dialog = useRef<HTMLDialogElement>(null)
  const restart = usePawnStore((state) => state.restartRun)
  const mainMenu = useAppStore((state) => state.showTitle)
  useEffect(() => {
    const element = dialog.current!
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [])
  return (
    <dialog ref={dialog} className="game-over-dialog" aria-labelledby="game-over-title" onCancel={(event) => event.preventDefault()}>
      <h2 id="game-over-title">GAME OVER</h2>
      <div className="game-over-actions">
        <button className="restart-run-button" autoFocus onClick={restart}>RESTART RUN</button>
        <button onClick={mainMenu}>MAIN MENU</button>
      </div>
    </dialog>
  )
}
