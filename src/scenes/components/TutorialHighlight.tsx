import { usePawnStore } from '../../game/state/pawnStore'
import { tutorialObjective } from '../../game/logic/tutorial'
import { gridToWorld } from '../../utils/grid'

export function TutorialHighlight(){
  const state=usePawnStore(),session=state.tutorial
  if(!session)return null
  const cell=tutorialObjective(session,state)
  if(!cell)return null
  return <group name="tutorial-known-objective" position={gridToWorld(cell.column,cell.row)}>
    <mesh position={[0,0.035,0]} rotation={[-Math.PI/2,0,Math.PI/4]} raycast={()=>{}}>
      <ringGeometry args={[0.48,0.51,4]}/><meshBasicMaterial color="#e1c477" transparent opacity={0.85} depthWrite={false}/>
    </mesh>
  </group>
}
