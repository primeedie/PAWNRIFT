import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { Html } from '@react-three/drei'
import { formNames, formSymbols } from '../../data/forms'
import { usePawnStore } from '../../game/state/pawnStore'
import { gridToWorld } from '../../utils/grid'
import { usePawnKeyboard } from '../../ui/usePawnKeyboard'
import { CharacterModel } from './CharacterModel'
import type { CharacterForm } from '../../data/characterDesigns'
import { presentationDuration } from '../../utils/characterAnimation'
import { useInspectionStore } from '../../ui/inspectionStore'

const facingAngles = { north: Math.PI, east: Math.PI / 2, south: 0, west: -Math.PI / 2 }

export function PawnCharacter() {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const progress = useRef(0)
  const state = usePawnStore()
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)'); const sync = () => setReducedMotion(preference.matches)
    sync(); preference.addEventListener('change', sync); return () => preference.removeEventListener('change', sync)
  }, [])
  const { cell, from, fromElevation, elevation, facing, isMoving, hp, dungeon, transformations } = state
  const lastHealth = useRef({ hp, dungeon })
  const recoil = useRef(0)
  useEffect(() => {
    if (lastHealth.current.dungeon !== dungeon) recoil.current = 0
    if (lastHealth.current.dungeon === dungeon && hp < lastHealth.current.hp) recoil.current = 0.2
    lastHealth.current = { hp, dungeon }
  }, [hp, dungeon])
  usePawnKeyboard()

  useLayoutEffect(() => {
    progress.current = 0
    const origin = isMoving ? from : cell
    const [x, , z] = gridToWorld(origin.column, origin.row)
    root.current?.position.set(x, isMoving ? fromElevation : elevation, z)
  }, [cell, from, isMoving, elevation, fromElevation])

  useFrame(({ clock, invalidate }, delta) => {
    if (!root.current || !body.current) return
    progress.current = Math.min(1, progress.current + delta / (presentationDuration(state) * (state.lastAction === 'ability' && transformations.active?.form === 'knight' ? 0.58 : 1) / 1000))
    const t = progress.current
    const eased = t * t * (3 - 2 * t)
    const start = gridToWorld(from.column, from.row)
    const end = gridToWorld(cell.column, cell.row)
    root.current.position.set(
      MathUtils.lerp(start[0], end[0], isMoving ? eased : 1),
      MathUtils.lerp(fromElevation, elevation, isMoving ? eased : 1) + (isMoving ? (reducedMotion ? 0 : Math.sin(t * Math.PI) * (transformations.active?.form === 'knight' && Math.abs(cell.column - from.column) + Math.abs(cell.row - from.row) === 3 ? 0.22 : 0.025)) : 0),
      MathUtils.lerp(start[2], end[2], isMoving ? eased : 1),
    )
    const target = state.phase === 'player' ? state.events.find((event) => event.actor === 'pawn' && event.kind === 'hit')?.cell : undefined
    const angle = target ? Math.atan2(target.column - cell.column, target.row - cell.row) : facingAngles[facing]
    const difference = Math.atan2(Math.sin(angle - root.current.rotation.y), Math.cos(angle - root.current.rotation.y))
    root.current.rotation.y += difference * (1 - Math.exp(-18 * delta))
    body.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 2.4) * 0.006
    recoil.current = Math.max(0, recoil.current - delta)
    body.current.rotation.x = reducedMotion ? 0 : Math.sin(recoil.current / 0.2 * Math.PI) * 0.08
    body.current.rotation.z = 0
    if (!reducedMotion || isMoving || state.phase !== 'ready' || recoil.current > 0) invalidate()
  })

  return (
    <group ref={root} name="pawn-protagonist" onClick={(event) => {event.stopPropagation();useInspectionStore.getState().dismiss()}}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.31, 16]} />
        <meshBasicMaterial color="#284f54" transparent opacity={0.23} depthWrite={false} />
      </mesh>
      <group ref={body}><CharacterModel key={`${transformations.active?.form ?? 'pawn'}:${transformations.active?.attunement ?? 'light'}`} form={(transformations.active?.form ?? 'pawn') as CharacterForm} variant={transformations.active?.attunement ?? 'light'} reducedMotion={reducedMotion} /></group>
      {transformations.active && <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[4, 0]}>
        <span className={`form-world-label attunement-${transformations.active.attunement}`}>
          {formSymbols[transformations.active.form]} {formNames[transformations.active.form]}
        </span>
      </Html>}
    </group>
  )
}
