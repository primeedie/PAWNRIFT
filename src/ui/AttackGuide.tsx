import { formNames, formSymbols, type ChessForm } from '../data/forms'
import { basicAttackPattern } from '../game/logic/formCombat'

export function AttackGuide({ form }: { form: ChessForm }) {
  const label = form === 'knight' ? 'Orthogonal reach 2.' : form === 'pawn' || form === 'rook' ? 'Orthogonal reach 1.' : 'Eight directions, reach 1.'
  return <figure className="movement-guide">
    <div className="movement-mini-board" role="img" aria-label={`${formNames[form]} basic attack: ${label} Choose one eligible foe; sight and terrain apply.`}>
      {Array.from({ length: 25 }, (_, id) => {
        const column = id % 5, row = Math.floor(id / 5), center = id === 12
        return <span key={id} aria-hidden="true" className={`mini-cell parity-${(row + column) % 2}`}
          data-kind={center ? 'center' : basicAttackPattern(form, { column: 2, row: 2 }, { column, row }) ? 'attack' : 'empty'}>
          {center ? formSymbols[form] : basicAttackPattern(form, { column: 2, row: 2 }, { column, row }) ? '×' : ''}
        </span>
      })}
    </div><figcaption>{label} Choose one target.</figcaption>
  </figure>
}
