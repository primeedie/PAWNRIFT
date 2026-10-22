import { TrainingDummy } from './TrainingDummy'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MathUtils, MeshLambertMaterial, Vector3 } from 'three'
import { turnTiming } from '../../data/combatBalance'
import { attackTargets, type Enemy } from '../../game/logic/combat'
import { enemyName, enemyStatuses } from '../../ui/enemyPresentation'
import { enemyLabelOffsets } from '../../utils/enemyLabels'
import { cellId } from '../../game/logic/dungeon'
import { canSeeContent } from '../../game/logic/visibility'
import { usePawnStore, type TurnPhase } from '../../game/state/pawnStore'
import { gridToWorld } from '../../utils/grid'
import { cardOptions } from '../../game/logic/cardRules'
import { abilityReason, royalDecreeTargets, vaultTargets } from '../../game/logic/signatures'
import { LegalTileHighlight } from './LegalTileHighlight'
import { visibleEnemies } from '../../game/logic/combatIndicators'
import { currentForm } from '../../game/logic/transformations'
import { gridDistance } from '../../game/logic/enemyAI'
import { gameplayBlocked, restoreGameFocus } from '../../ui/hudInteraction'

function Rookling({ enemy, phase, interpolate, label }: { enemy: Enemy; phase: TurnPhase; interpolate: boolean; label: (node: HTMLDivElement | null) => void }) {
  const state = usePawnStore()
  const impact = state.events.filter((event) => event.targetId === enemy.id && event.kind === 'hit').at(-1)?.effect
  const impactColor = impact === 'splash' || impact === 'burn' ? '#ad91bc' : impact === 'concussion' ? '#c4aa75'
    : impact === 'pierce' ? '#89aec7' : '#b46864'
  const root = useRef<Group>(null)
  const material = useRef<MeshLambertMaterial>(null)
  const progress = useRef(0)
  const flash = useRef(0)
  const lastHp = useRef(enemy.hp)
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
    material.current?.color.set(flash.current ? impactColor : enemy.kind === 'dummy' ? '#97745d' : '#626d78')
  })
  return (
    <group ref={root} name={enemy.id} onClick={(event) => {
      event.stopPropagation()
      const state = usePawnStore.getState()
      if (gameplayBlocked()) { state.recordInputBlocked(); return }
      restoreGameFocus()
      if (state.selectedCardId) state.playSelectedCard({ kind: 'enemy', enemyId: enemy.id })
      else if (state.selectedAbility) state.tryAbility(currentForm(state.transformations) === 'knight' ? enemy.id : undefined)
      else state.tryAttack(enemy.id)
    }}>
      {enemy.kind === 'dummy' ? <TrainingDummy materialRef={material} /> : <>
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
      </>}
      <Html position={[0, 1.22, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={label} className="enemy-label" aria-label={`${enemyName(enemy)} ${enemy.hp}/${enemy.maxHp}`}>
        <span>{enemyName(enemy)} <strong>{enemy.hp}/{enemy.maxHp}</strong></span>
        <span className="health-track" role="progressbar" aria-label={`${enemyName(enemy)} health`} aria-valuemin={0} aria-valuemax={enemy.maxHp} aria-valuenow={enemy.hp}>
          <span style={{ width: `${100 * enemy.hp / enemy.maxHp}%` }} />
        </span>
        <span className="enemy-status-icons">{enemyStatuses(enemy).map((status) => <span key={status.label} className={`status-${status.tone ?? 'neutral'}`} aria-label={status.label}>{status.icon}{status.count ?? ''}</span>)}</span>
      </div>
      </Html>
    </group>
  )
}

export function DungeonEnemies() {
  const state = usePawnStore()
  const labels = useRef(new Map<string,HTMLDivElement>()), projected = useRef(new Vector3())
  const targets = state.phase !== 'ready' || state.status !== 'playing' ? [] : state.selectedCardId ? cardOptions(state, state.selectedCardId).targets
    : state.selectedAbility && state.abilityDestination && !abilityReason(state)
      ? vaultTargets(state, state.abilityDestination, true).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id }))
      : state.selectedAbility && currentForm(state.transformations) === 'king' && !abilityReason(state)
        ? royalDecreeTargets(state).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id }))
      : state.selectedAbility && currentForm(state.transformations) === 'queen'
        ? visibleEnemies(state).filter((enemy) => gridDistance(enemy.cell, state.cell) <= 3).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id })) : state.selectedAbility ? []
          : attackTargets(state).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id }))
  const presented = state.phase === 'player' ? state.enemies.filter((enemy) => canSeeContent(cellId(enemy.cell), state)
    && (enemy.hp > 0 || state.events.some((event) => event.kind === 'defeat' && event.actor === enemy.id && event.seen))) : visibleEnemies(state)
  useFrame(({ camera,size }) => {
    const positions = presented.map((enemy) => {
      const [x,,z] = gridToWorld(enemy.cell.column,enemy.cell.row)
      const p = projected.current.set(x,1.22,z).project(camera)
      return { id: enemy.id,x:(p.x+1)*size.width/2,y:(1-p.y)*size.height/2 }
    })
    for (const [id,offset] of enemyLabelOffsets(positions,size.height)) {
      const node=labels.current.get(id); if (node) node.style.transform=`translateY(${offset}px)`
    }
  })
  return <group name="dungeon-enemies">
    {presented.map((enemy) => (
      <group key={enemy.id}>
        {targets.some((target) => target.kind === 'enemy' && target.enemyId === enemy.id)
          && <group position={gridToWorld(enemy.cell.column, enemy.cell.row)}><LegalTileHighlight attack /></group>}
        <Rookling enemy={enemy} phase={state.phase} interpolate={canSeeContent(cellId(enemy.from), state)} label={(node) => { if (node) labels.current.set(enemy.id,node); else labels.current.delete(enemy.id) }} />
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
