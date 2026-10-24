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
import { vaultDestinations } from '../../game/logic/signatures'
import { elevationAt } from '../../game/logic/perching'
import { gameplayBlocked, restoreGameFocus } from '../../ui/hudInteraction'
import { consumeInspectionBoardClick, useInspectionStore } from '../../ui/inspectionStore'
import { useInteractionStore } from '../../ui/interactionStore'
import { eligibleInteractions } from '../../game/logic/interactions'
import { TutorialHighlight } from './TutorialHighlight'
import { BiomeAdornment, RouteExit, TreasureChest, WorldAccent } from './FloorObjects'

export function DungeonBoard() {
  const state = usePawnStore()
  const { tryMove, dungeon } = state
  const focusedId=useInteractionStore(ui=>ui.focusedId),aimingAttack=useInspectionStore(ui=>ui.aimingAttack)
  const interactions=state.phase==='ready'&&!state.selectedCardId&&!state.selectedAbility&&!aimingAttack?eligibleInteractions(state):[]
  const focused=interactions.find(item=>item.id===focusedId)??interactions[0]
  const debugReveal = state.revealAll
  const destinations = state.phase === 'ready' && state.status === 'playing'
    ? state.selectedCardId ? cardOptions(state, state.selectedCardId).targets.flatMap((target) => target.kind === 'tile' ? [{ ...target.cell, uncertain: false }] : [])
      : state.selectedAbility ? state.transformations.active?.form === 'knight'
        ? vaultDestinations(state).map((cell) => ({ ...cell, uncertain: !state.visible.has(cellId(cell)) })) : [] : movementPreviews(state) : []
  return (
    <group name="dungeon-board" key={`${dungeon.seed}:${dungeon.style}`}>
      <TutorialHighlight/>
      {dungeon.tiles.map((tile) => {
        const id = cellId(tile)
        const visibility = debugReveal ? 'visible' : tileVisibility(id, state)
        const preview = destinations.find((destination) => sameCell(destination, tile))
        const canInteract = visibility === 'visible' || !!preview
        return (
          <group key={id} position={gridToWorld(tile.column, tile.row)} onClick={(event) => {
            event.stopPropagation()
            if (gameplayBlocked()) { state.recordInputBlocked(); return }
            if (consumeInspectionBoardClick()) {restoreGameFocus();return}
            if (!canInteract) return
            restoreGameFocus()
            if (state.selectedCardId) state.playSelectedCard({ kind: 'tile', cell: tile })
            else if (state.selectedAbility) state.selectAbilityDestination(tile)
            else tryMove(tile)
          }}>
            <FoggedTerrain key={`${state.floorContent?.alignment}:${state.floorContent?.biome}`} visibility={visibility}>
              <TerrainTile column={tile.column} row={tile.row} biome={state.floorContent?.biome} alignment={state.floorContent?.alignment} />
              {tile.prop && <group rotation={[0, tile.rotation, 0]}><GeometricProp kind={tile.prop} alignment={state.floorContent?.alignment} /></group>}
              {tile.decoration && <group position={[tile.decoration.corner % 2 ? 0.32 : -0.32, 0, tile.decoration.corner < 2 ? -0.32 : 0.32]}
                scale={tile.decoration.kind === 'tree' ? 0.32 : 0.42} rotation={[0, tile.rotation, 0]}>
                {tile.decoration.motif?<BiomeAdornment motif={tile.decoration.motif} alignment={state.floorContent?.alignment}/>:<GeometricProp kind={tile.decoration.kind} alignment={state.floorContent?.alignment} />}
              </group>}
              {tile.decoration&&state.floorContent&&id%3===0&&<group position={[tile.decoration.corner%2?0.3:-0.3,0,tile.decoration.corner<2?-0.3:0.3]}><WorldAccent alignment={state.floorContent.alignment}/></group>}
              {state.signatures.reveal?.cells.includes(id) && <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                <ringGeometry args={[0.57, 0.585, 4]} /><meshBasicMaterial color={state.signatures.reveal.foresight ? '#a698c1' : '#c1aa76'} transparent opacity={0.6} depthWrite={false} />
              </mesh>}
              {!state.floorContent&&state.mode !== 'training' && sameCell(tile, dungeon.exit) && <ExitMarker />}
              <group visible={state.explored.has(id)}>{state.floorContent?.exits.filter(exit=>sameCell(exit.cell,tile)).map(exit=><RouteExit key={exit.alignment} alignment={exit.alignment}/>)}</group>
            </FoggedTerrain>
            {state.visible.has(id)&&state.floorContent?.chests.filter(chest=>sameCell(chest.cell,tile)).map(chest=><TreasureChest key={chest.id} chest={chest}/>)}
            {focused&&sameCell(focused.cell,tile)&&<mesh name="focused-interaction-ring" position={[0,0.022,0]} rotation={[-Math.PI/2,0,0]} raycast={()=>{}}>
              <ringGeometry args={[0.37,0.40,16]}/><meshBasicMaterial color="#d3bf8b" transparent opacity={0.85} depthWrite={false}/>
            </mesh>}
            {preview && <group position={[0, state.explored.has(id) ? elevationAt(dungeon, tile) : 0, 0]}><LegalTileHighlight uncertain={preview.uncertain}
              selected={!!state.abilityDestination && sameCell(state.abilityDestination, tile)} /></group>}
          </group>
        )
      })}
    </group>
  )
}
