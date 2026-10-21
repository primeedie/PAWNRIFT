import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { usePawnStore } from '../../game/state/pawnStore'
import { gridToWorld } from '../../utils/grid'
import { usePawnKeyboard } from '../../ui/usePawnKeyboard'
import { PawnModel } from './PawnModel'
import { turnTiming } from '../../data/combatBalance'

const facingAngles = { north: Math.PI, east: Math.PI / 2, south: 0, west: -Math.PI / 2 }
const STEP_SECONDS = turnTiming.playerMs / 1000

export function PawnCharacter() {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const progress = useRef(0)
  const { cell, from, facing, isMoving } = usePawnStore()
  usePawnKeyboard()

  useLayoutEffect(() => {
    progress.current = 0
    const origin = isMoving ? from : cell
    root.current?.position.set(...gridToWorld(origin.column, origin.row))
  }, [cell, from, isMoving])

  useFrame(({ clock, invalidate }, delta) => {
    if (!root.current || !body.current) return
    progress.current = Math.min(1, progress.current + delta / STEP_SECONDS)
    const t = progress.current
    const eased = t * t * (3 - 2 * t)
    const start = gridToWorld(from.column, from.row)
    const end = gridToWorld(cell.column, cell.row)
    root.current.position.set(
      MathUtils.lerp(start[0], end[0], isMoving ? eased : 1),
      isMoving ? Math.sin(t * Math.PI) * 0.055 : 0,
      MathUtils.lerp(start[2], end[2], isMoving ? eased : 1),
    )
    const angle = facingAngles[facing]
    const difference = Math.atan2(Math.sin(angle - root.current.rotation.y), Math.cos(angle - root.current.rotation.y))
    root.current.rotation.y += difference * (1 - Math.exp(-18 * delta))
    body.current.position.y = Math.sin(clock.elapsedTime * 2.4) * 0.012
    body.current.rotation.z = Math.sin(clock.elapsedTime * (isMoving ? 18 : 1.7)) * (isMoving ? 0.035 : 0.012)
    invalidate() // Keep only this small idle animation alive in the demand-rendered scene.
  })

  return (
    <group ref={root} name="pawn-protagonist" onClick={(event) => event.stopPropagation()}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.31, 16]} />
        <meshBasicMaterial color="#284f54" transparent opacity={0.23} depthWrite={false} />
      </mesh>
      <group ref={body}><PawnModel /></group>
    </group>
  )
}
