import { TrainingDummy } from './TrainingDummy'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MathUtils, MeshLambertMaterial } from 'three'
import { turnTiming } from '../../data/combatBalance'
import { attackTargets, enemyIntentLabel, foresightIntent, type Enemy } from '../../game/logic/combat'
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

function Rookling({ enemy, phase, interpolate }: { enemy: Enemy; phase: TurnPhase; interpolate: boolean }) {
  const state = usePawnStore()
  const foresight = foresightIntent(state, enemy.id)
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
      <Html position={[0, 1.18, 0]} center zIndexRange={[4, 0]} className="enemy-label" style={{ pointerEvents: 'none' }}>
        <span>{enemy.kind === 'dummy' ? `Dummy (${enemy.boss ? 'boss' : enemy.elite ? 'elite' : 'normal'})` : 'Rookling'} · {enemy.hp}/{enemy.maxHp}</span>
        <span className="health-track" role="progressbar" aria-label="Rookling health" aria-valuemin={0} aria-valuemax={enemy.maxHp} aria-valuenow={enemy.hp}>
          <span style={{ width: `${100 * enemy.hp / enemy.maxHp}%` }} />
        </span>
        <small data-threat={enemy.intent === 'attack'}>{enemyIntentLabel(enemy)}</small>
        {foresight && <small>Next: {foresight}</small>}
        {enemy.burn && <small className="status-burn">Burn 1 x {enemy.burn.turnsLeft}</small>}
        {!!enemy.bleed?.length && <small className="status-bleed">Bleed {enemy.bleed.map((stack) => `◆${stack.turnsLeft}`).join(' ')}</small>}
        {enemy.concussion !== undefined && <small className="status-concussion">Concussion {enemy.concussion === 0 ? 'next response' : enemy.concussion}</small>}
        {enemy.stunned && <small className="status-concussion">STUNNED</small>}
        {!!enemy.stunImmunity && <small>Stun immunity {enemy.stunImmunity}</small>}
        {!!enemy.exposedTurns && <small>Exposed +2</small>}
        {!!enemy.fearTurns && <small>Fear · 1 response</small>}
        {!!enemy.weakenedDamage && <small>Next strike −{enemy.weakenedDamage}</small>}
      </Html>
    </group>
  )
}

export function DungeonEnemies() {
  const state = usePawnStore()
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
  return <group name="dungeon-enemies">
    {presented.map((enemy) => (
      <group key={enemy.id}>
        {targets.some((target) => target.kind === 'enemy' && target.enemyId === enemy.id)
          && <group position={gridToWorld(enemy.cell.column, enemy.cell.row)}><LegalTileHighlight attack /></group>}
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
