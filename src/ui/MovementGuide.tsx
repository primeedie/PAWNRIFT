import { formNames, formSymbols, type ChessForm } from '../data/forms'
import { formMovement } from '../game/logic/chessMovement'
import type { Cell } from '../game/logic/movement'

export function movementDiagram(form: ChessForm, blocked:Cell[]=[]) {
  const available=Array.from({length:25},(_,id)=>({column:id%5,row:Math.floor(id/5)}))
  const board={size:5,available,blocked,occupied:[],visible:new Set(available.map(cell=>cell.row*5+cell.column))}
  return Array.from({ length: 25 }, (_, id) => {
    const x = id % 5 - 2, y = Math.floor(id / 5) - 2
    const distance = Math.abs(x) + Math.abs(y)
    const tile=available[id],legal=formMovement(form)({column:2,row:2},tile,board)
    const kind = id===12?'center':blocked.some(cell=>cell.column===tile.column&&cell.row===tile.row)?'obstacle':!legal?'empty'
      :form==='pawn'||form==='king'||((form==='knight'||form==='bishop')&&distance===1)?'walk':form==='knight'?'leap':'slide'
    return { id, x, y, kind }
  })
}
export function MovementGuide({ form,blocked=[] }: { form: ChessForm;blocked?:Cell[] }) {
  const label = form === 'knight' ? 'Dot: walk 1. L: leap (2 + 1).' : form === 'pawn' ? 'One orthogonal step.' : form === 'king' ? 'One step in any direction.' : form === 'bishop' ? 'Visible diagonals up to 7; walk 1. Shift + key: diagonal.' : 'Visible clear lanes: slide up to 7.'
  return <figure className="movement-guide">
    <div className="movement-mini-board" data-form={form} role="img" aria-label={`${formNames[form]} movement diagram. ${label} Instructional only; actual terrain and occupants still apply.`}>
      {movementDiagram(form,blocked).map(({ id, x, y, kind }) => <span key={id} aria-hidden="true"
        className={`mini-cell parity-${(x + y + 4) % 2}`} data-kind={kind}>
        {kind === 'center' ? formSymbols[form] : kind === 'obstacle'?'▧':kind === 'leap' ? 'L' : kind === 'walk' ? '●' : kind === 'slide' ? '◆' : ''}
      </span>)}
    </div>
    <figcaption>{label} ● step · ◆ slide · L leap{blocked.length>0?' · ▧ obstacle':''}. Diagram only.</figcaption>
  </figure>
}
