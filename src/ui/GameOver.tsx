import { useEffect, useRef } from 'react'
import { useAppStore } from '../game/state/appStore'
import { usePawnStore } from '../game/state/pawnStore'
import { retentionChoices } from '../game/logic/transformations'
import { formNames } from '../data/forms'

export function GameOver() {
  const dialog = useRef<HTMLDialogElement>(null)
  const restart = usePawnStore((state) => state.restartRun)
  const mainMenu = useAppStore((state) => state.showTitle)
  const state = usePawnStore()
  const choices = retentionChoices(state.transformations)
  const pending = !state.deathRetentionDone && choices.length > 0
  useEffect(() => {
    const element = dialog.current!
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [])
  return (
    <dialog ref={dialog} className="game-over-dialog" aria-labelledby="game-over-title" onCancel={(event) => event.preventDefault()}>
      <h2 id="game-over-title">GAME OVER</h2>
      {pending && <fieldset className="death-retention"><legend>Keep one transformation</legend>
        <p>{choices.length > 1 ? 'Other carried transformations will be lost.' : 'Keep its remaining charges and applicable recovery.'}</p>
        {choices.map((item) => <button key={item.form} onClick={() => state.chooseRetention(item.form)}>
          Keep {formNames[item.form]} · {item.charges}/5 charges
        </button>)}
      </fieldset>}
      {state.deathRetentionDone && <p>Transformation retained.{state.transformations.recovery > 0 ? ' Recovery: 1 full Pawn floor.' : ''}</p>}
      <div className="game-over-actions">
        <button className="restart-run-button" autoFocus={!pending} disabled={pending} onClick={restart}>RESTART RUN</button>
        <button onClick={mainMenu}>MAIN MENU</button>
      </div>
    </dialog>
  )
}
