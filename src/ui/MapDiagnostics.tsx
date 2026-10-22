import { usePawnStore } from '../game/state/pawnStore'
import { diagnosticLayers, mapDiagnostics } from '../game/logic/playtesting'
export function MapDiagnostics() {
  const state = usePawnStore(), map = mapDiagnostics(state)
  const format = (cells: readonly { column: number; row: number }[]) => cells.map((cell) => `(${cell.column},${cell.row})`).join(' ') || 'None'
  return <details className="map-diagnostics" onToggle={(event) => state.setDiagnostics(event.currentTarget.open)}><summary>Map Diagnostics</summary>
    <dl className="diagnostic-values">
      <dt>Status</dt><dd><strong>{map.issues.length ? 'INVALID' : 'VALID'}</strong>{map.issues.map((issue) => <p key={issue}>{issue}</p>)}</dd>
      <dt>Master seed</dt><dd>{state.masterSeed}</dd><dt>Floor seed</dt><dd>{state.dungeon.seed}</dd>
      <dt>Position / tile</dt><dd>{format([state.cell])} / {map.tile ? map.tile.prop ?? 'walkable' : 'void / missing'}{state.elevation ? ' (perched)' : ''}</dd>
      <dt>Walkable / reachable</dt><dd>{map.open.size} / {map.reachable.size}</dd>
      <dt>Required route</dt><dd>{map.connected ? 'Connected' : 'Unreachable'}</dd>
      <dt>Pawn destinations</dt><dd>{format(map.pawn)}</dd><dt>Form destinations</dt><dd>{format(map.active)}</dd>
      <dt>Floor / world turn</dt><dd>{state.floorNumber} / {state.turn}</dd>
      <dt>Last rejected input</dt><dd>{state.lastMovementRejection ?? 'None'}</dd>
      <dt>Generation recovery</dt><dd>{state.dungeon.generation?.fallback ? 'Fallback' : state.dungeon.generation?.repaired ? 'Repaired' : 'First valid layout'}; attempt {state.dungeon.generation?.attempt ?? 0}</dd>
      {!!state.dungeon.generation?.issues.length && <><dt>Generation issues</dt><dd>{state.dungeon.generation.issues.join('; ')}</dd></>}
    </dl>
    <p>Destinations use known terrain and currently visible occupants. Unscouted moves remain tentative; diagnostics never display hidden entities.</p>
    <fieldset><legend>Logical terrain overlays</legend>{diagnosticLayers.map((layer) => <label key={layer} className="dev-checkbox">
      <input type="checkbox" checked={state.diagnosticLayers.includes(layer)} onChange={() => state.toggleDiagnostic(layer)} />{layer === 'exit' ? 'Progression destination' : layer}
    </label>)}</fieldset>
  </details>
}
