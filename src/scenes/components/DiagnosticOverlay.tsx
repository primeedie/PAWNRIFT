import { cellFromId, cellId } from '../../game/logic/dungeon'
import { mapDiagnostics, type DiagnosticLayer } from '../../game/logic/playtesting'
import { usePawnStore } from '../../game/state/pawnStore'
import { gridToWorld } from '../../utils/grid'

const colors: Record<DiagnosticLayer, string> = { walkable: '#74b7ac', obstacles: '#e29a9a', void: '#b4c0ca', reachable: '#94b7d6', legal: '#e1c477', spawn: '#eee5d5', exit: '#b5a0d3' }
export function DiagnosticOverlay() {
  const state = usePawnStore()
  if (!state.diagnosticLayers.length) return null
  const map = mapDiagnostics(state), legal = new Set(map.active.map(cellId)), enabled = state.diagnosticLayers
  return <group name="logical-map-diagnostics">{Array.from({ length: 64 }, (_, id) => {
    const tile = state.dungeon.tiles.find((tile) => cellId(tile) === id)
    const layer = enabled.includes('spawn') && id === cellId(state.dungeon.spawn) ? 'spawn'
      : enabled.includes('exit') && id === cellId(state.dungeon.exit) ? 'exit'
        : enabled.includes('legal') && legal.has(id) ? 'legal'
          : enabled.includes('reachable') && map.reachable.has(id) ? 'reachable'
            : enabled.includes('obstacles') && tile?.blocksMovement ? 'obstacles'
              : enabled.includes('walkable') && tile && !tile.blocksMovement ? 'walkable'
                : enabled.includes('void') && !tile ? 'void' : undefined
    if (!layer) return null
    const cell = cellFromId(id), [x, , z] = gridToWorld(cell.column, cell.row)
    return <mesh key={id} position={[x, (tile?.perchHeight ?? 0) + 0.035, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} raycast={() => {}}>
      <ringGeometry args={[0.42, 0.53, 4]} /><meshBasicMaterial color={colors[layer]} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  })}</group>
}
