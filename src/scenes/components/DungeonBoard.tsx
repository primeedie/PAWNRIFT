import { gridToWorld } from '../../utils/grid'
import { sameCell } from '../../game/logic/movement'
import { cellId } from '../../game/logic/dungeon'
import { tileVisibility } from '../../game/logic/visibility'
import { usePawnStore } from '../../game/state/pawnStore'
import { GeometricProp } from './GeometricProps'
import { TerrainTile } from './TerrainTile'
import { LegalTileHighlight } from './LegalTileHighlight'
import { FoggedTerrain } from './FoggedTerrain'
import { ExitMarker } from './ExitMarker'
import { cardOptions } from '../../game/logic/cardRules'
import { movementPreviews } from '../../game/logic/formCombat'

export function DungeonBoard() {
  const state = usePawnStore()
  const { tryMove, dungeon } = state
  const debugReveal = state.revealAll
  const destinations = state.phase === 'ready' && state.status === 'playing'
    ? state.selectedCardId ? cardOptions(state, state.selectedCardId).targets.flatMap((target) => target.kind === 'tile' ? [{ ...target.cell, uncertain: false }] : [])
      : state.selectedAbility ? [] : movementPreviews(state) : []
  return (
    <group name="dungeon-board" key={`${dungeon.seed}:${dungeon.style}`}>
      {dungeon.tiles.map((tile) => {
        const id = cellId(tile)
        const visibility = debugReveal ? 'visible' : tileVisibility(id, state)
        const preview = destinations.find((destination) => sameCell(destination, tile))
        const canInteract = visibility === 'visible' || !!preview
        return (
          <group key={id} position={gridToWorld(tile.column, tile.row)} onClick={(event) => {
            if (!canInteract) return
            event.stopPropagation()
            if (state.selectedCardId) state.playSelectedCard({ kind: 'tile', cell: tile })
            else if (!state.selectedAbility) tryMove(tile)
          }}>
            <FoggedTerrain visibility={visibility}>
              <TerrainTile column={tile.column} row={tile.row} />
              {tile.prop && <group rotation={[0, tile.rotation, 0]}><GeometricProp kind={tile.prop} /></group>}
              {sameCell(tile, dungeon.exit) && <ExitMarker />}
            </FoggedTerrain>
            {preview && <LegalTileHighlight uncertain={preview.uncertain} />}
          </group>
        )
      })}
    </group>
  )
}
