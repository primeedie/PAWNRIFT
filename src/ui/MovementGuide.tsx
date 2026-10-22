import { formNames, formSymbols, type ChessForm } from '../data/forms'

export function movementDiagram(form: ChessForm) {
  return Array.from({ length: 25 }, (_, id) => {
    const x = id % 5 - 2, y = Math.floor(id / 5) - 2
    const distance = Math.abs(x) + Math.abs(y)
    const diagonal = Math.abs(x) === Math.abs(y) && x !== 0
    const straight = (x === 0) !== (y === 0)
    const leap = (Math.abs(x) === 1 && Math.abs(y) === 2) || (Math.abs(x) === 2 && Math.abs(y) === 1)
    const kind = x === 0 && y === 0 ? 'center' : form === 'pawn' ? distance === 1 ? 'walk' : 'empty'
      : form === 'king' ? Math.max(Math.abs(x), Math.abs(y)) === 1 ? 'walk' : 'empty'
      : form === 'knight' ? distance === 1 ? 'walk' : leap ? 'leap' : 'empty'
        : form === 'bishop' && distance === 1 ? 'walk' : (form === 'bishop' ? diagonal : form === 'rook' ? straight : diagonal || straight) ? 'slide' : 'empty'
    return { id, x, y, kind }
  })
}
export function MovementGuide({ form }: { form: ChessForm }) {
  const label = form === 'knight' ? 'Dot: walk 1. L: leap (2 + 1).' : form === 'pawn' ? 'One orthogonal step.' : form === 'king' ? 'One step in any direction.' : form === 'bishop' ? 'Visible diagonals up to 7; walk 1. Shift + key: diagonal.' : 'Visible clear lanes: slide up to 7.'
  return <figure className="movement-guide">
    <div className="movement-mini-board" data-form={form} role="img" aria-label={`${formNames[form]} movement diagram. ${label} Instructional only; actual terrain and occupants still apply.`}>
      {movementDiagram(form).map(({ id, x, y, kind }) => <span key={id} aria-hidden="true"
        className={`mini-cell parity-${(x + y + 4) % 2}`} data-kind={kind}>
        {kind === 'center' ? formSymbols[form] : kind === 'leap' ? 'L' : kind === 'walk' ? '●' : kind === 'slide' ? '◆' : ''}
      </span>)}
    </div>
    <figcaption>{label}</figcaption>
  </figure>
}
