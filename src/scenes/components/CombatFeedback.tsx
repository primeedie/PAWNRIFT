import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'
import { usePawnStore } from '../../game/state/pawnStore'
import { cellId } from '../../game/logic/dungeon'
import { canSeeContent } from '../../game/logic/visibility'
import { gridToWorld } from '../../utils/grid'

function Pulse({ column, row, guard }: { column: number; row: number; guard: boolean }) {
  const material = useRef<MeshBasicMaterial>(null)
  const age = useRef(0)
  useFrame((_, delta) => {
    age.current += delta
    if (material.current) material.current.opacity = Math.max(0, 0.8 * (1 - age.current / 0.4))
  })
  const [x, , z] = gridToWorld(column, row)
  return <mesh position={[x, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[0.3, 0.42, 16]} />
    <meshBasicMaterial ref={material} color={guard ? '#bdc9c3' : '#d96a70'} transparent depthWrite={false} opacity={0.8} />
  </mesh>
}

export function CombatFeedback() {
  const state = usePawnStore()
  return <group key={`${state.actionId}:${state.phase}`} name="combat-feedback">
    {state.phase !== 'ready' && state.events.filter((event) => event.seen
      && ['hit', 'counter', 'guard'].includes(event.kind) && canSeeContent(cellId(event.cell), state))
      .map((event, index) => <Pulse key={index} {...event.cell} guard={event.kind === 'guard'} />)}
  </group>
}
