import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MathUtils, MeshLambertMaterial } from 'three'
import { turnTiming } from '../../data/combatBalance'
import { enemyIntentLabel, type Enemy } from '../../game/logic/combat'
import { cellId } from '../../game/logic/dungeon'
import { canSeeContent } from '../../game/logic/visibility'
import { usePawnStore, type TurnPhase } from '../../game/state/pawnStore'
import { gridToWorld } from '../../utils/grid'

function Rookling({ enemy, phase, interpolate }: { enemy: Enemy; phase: TurnPhase; interpolate: boolean }) {
  const root = useRef<Group>(null)
  const material = useRef<MeshLambertMaterial>(null)
  const progress = useRef(0)
  const flash = useRef(0)
  const lastHp = useRef(enemy.hp)
  const tryAttack = usePawnStore((state) => state.tryAttack)
  useLayoutEffect(() => {
    progress.current = 0
    const origin = phase === 'enemies' && interpolate ? enemy.from : enemy.cell
    root.current?.position.set(...gridToWorld(origin.column, origin.row))
  }, [enemy.from, enemy.cell, phase, interpolate])
  useEffect(() => {
    if (enemy.hp < lastHp.current) flash.current = 0.22
    lastHp.current = enemy.hp
  }, [enemy.hp])
  useFrame((_, delta) => {
    if (!root.current) return
    progress.current = Math.min(1, progress.current + delta / (turnTiming.enemyMs / 1000))
    const t = phase === 'enemies' && interpolate ? progress.current : 1
    const eased = t * t * (3 - 2 * t)
    const a = gridToWorld(enemy.from.column, enemy.from.row), b = gridToWorld(enemy.cell.column, enemy.cell.row)
    root.current.position.set(MathUtils.lerp(a[0], b[0], eased), Math.sin(t * Math.PI) * 0.035, MathUtils.lerp(a[2], b[2], eased))
    flash.current = Math.max(0, flash.current - delta)
    material.current?.color.set(flash.current ? '#b46864' : '#626d78')
  })
  return (
    <group ref={root} name={enemy.id} onClick={(event) => { event.stopPropagation(); tryAttack(enemy.id) }}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.26, 0.29, 0.16, 8]} />
        <meshLambertMaterial color="#46515f" flatShading />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.21, 0.17, 0.5, 8]} />
        <meshLambertMaterial ref={material} color="#626d78" flatShading />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.47, 0.12, 0.4]} />
        <meshLambertMaterial color="#7c8585" flatShading />
      </mesh>
      {[-0.16, 0.16].map((x) => <mesh key={x} position={[x, 0.77, 0]}>
        <boxGeometry args={[0.12, 0.16, 0.4]} />
        <meshLambertMaterial color="#7c8585" flatShading />
      </mesh>)}
      <mesh position={[0, 0.48, 0.179]}>
        <boxGeometry args={[0.16, 0.045, 0.035]} />
        <meshBasicMaterial color={enemy.intent === 'attack' ? '#f2ba76' : '#c9786f'} />
      </mesh>
      <Html position={[0, 1.05, 0]} center className="enemy-label" style={{ pointerEvents: 'none' }}>
        <span>Rookling · {enemy.hp}/{enemy.maxHp}</span>
        <meter aria-label="Rookling health" min={0} max={enemy.maxHp} value={enemy.hp} />
        <small data-threat={enemy.intent === 'attack'}>{enemyIntentLabel(enemy)}</small>
      </Html>
    </group>
  )
}

export function DungeonEnemies() {
  const state = usePawnStore()
  return <group name="dungeon-enemies">
    {state.enemies.filter((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state)).map((enemy) => (
      <group key={enemy.id}>
        <Rookling enemy={enemy} phase={state.phase} interpolate={canSeeContent(cellId(enemy.from), state)} />
        {enemy.intent === 'attack' && enemy.attackTarget && canSeeContent(cellId(enemy.attackTarget), state) && (
          <mesh position={gridToWorld(enemy.attackTarget.column, enemy.attackTarget.row).map((v, i) => i === 1 ? 0.025 : v) as [number, number, number]}
            rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <ringGeometry args={[0.47, 0.55, 4]} />
            <meshBasicMaterial color="#d3a66e" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        )}
      </group>
    ))}
  </group>
}
