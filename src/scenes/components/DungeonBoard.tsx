import { gridToWorld } from '../../utils/grid'
import { movementBoard } from '../../game/logic/combat'
import { legalDestinations, sameCell } from '../../game/logic/movement'
import { cellId } from '../../game/logic/dungeon'
import { tileVisibility } from '../../game/logic/visibility'
import { usePawnStore } from '../../game/state/pawnStore'
import { GeometricProp } from './GeometricProps'
import { TerrainTile } from './TerrainTile'
import { LegalTileHighlight } from './LegalTileHighlight'
import { FoggedTerrain } from './FoggedTerrain'
import { ExitMarker } from './ExitMarker'

export function DungeonBoard() {
  const state = usePawnStore()
  const { cell, tryMove, dungeon } = state
  const debugReveal = import.meta.env.DEV && state.revealAll
  const destinations = state.phase === 'ready' && state.status === 'playing' ? legalDestinations(cell, movementBoard(state)) : []
  return (
    <group name="dungeon-board" key={`${dungeon.seed}:${dungeon.style}`}>
      {dungeon.tiles.map((tile) => {
        const id = cellId(tile)
        const visibility = debugReveal ? 'visible' : tileVisibility(id, state)
        const canInteract = visibility === 'visible'
        return (
          <group key={id} position={gridToWorld(tile.column, tile.row)} onClick={(event) => {
            if (!canInteract) return
            event.stopPropagation()
            tryMove(tile)
          }}>
            <FoggedTerrain visibility={visibility}>
              <TerrainTile column={tile.column} row={tile.row} />
              {tile.prop && <group rotation={[0, tile.rotation, 0]}><GeometricProp kind={tile.prop} /></group>}
              {sameCell(tile, dungeon.exit) && <ExitMarker />}
            </FoggedTerrain>
            {canInteract && destinations.some((destination) => sameCell(destination, tile)) && <LegalTileHighlight />}
          </group>
        )
      })}
    </group>
  )
}
