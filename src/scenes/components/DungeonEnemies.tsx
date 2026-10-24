import { TrainingDummy } from './TrainingDummy'
import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Group, MathUtils, MeshLambertMaterial } from 'three'
import { turnTiming } from '../../data/combatBalance'
import { attackTargets, type Enemy } from '../../game/logic/combat'
import { EnemyHealthBar } from '../../ui/EnemyHealthBar'
import { clickEnemy, useInspectionStore } from '../../ui/inspectionStore'
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
import { impactPresentationDelay, targetReaction } from '../../utils/combatPresentation'
import { PortaEnemyModel } from './PortaEnemyModel'
import { currentThreat } from '../../game/logic/enemyTactics'
import { enemyPresentationDuration } from '../../utils/characterAnimation'

function Rookling({ enemy, phase, interpolate }: { enemy: Enemy; phase: TurnPhase; interpolate: boolean }) {
  const state = usePawnStore()
  const impact = state.events.filter((event) => event.targetId === enemy.id && event.kind === 'hit').at(-1)?.effect
  const impactColor = impact === 'splash' || impact === 'burn' ? '#ad91bc' : impact === 'concussion' ? '#c4aa75'
    : impact === 'pierce' ? '#89aec7' : '#b46864'
  const root = useRef<Group>(null)
  const material = useRef<MeshLambertMaterial>(null)
  const progress = useRef(0)
  const flash = useRef({key:'',elapsed:0})
  useLayoutEffect(() => {
    progress.current = 0
    const origin = phase === 'enemies' && interpolate ? enemy.from : enemy.cell
    root.current?.position.set(...gridToWorld(origin.column, origin.row))
  }, [enemy.from, enemy.cell, phase, interpolate])
  useFrame((_, delta) => {
    if (!root.current) return
    progress.current = Math.min(1, progress.current + delta / ((enemy.tactics?enemyPresentationDuration(state):turnTiming.enemyMs) / 1000))
    const t = phase === 'enemies' && interpolate ? progress.current : 1
    const eased = t * t * (3 - 2 * t)
    const a = gridToWorld(enemy.from.column, enemy.from.row), b = gridToWorld(enemy.cell.column, enemy.cell.row)
    root.current.position.set(MathUtils.lerp(a[0], b[0], eased), Math.sin(t * Math.PI) * 0.035, MathUtils.lerp(a[2], b[2], eased))
    const key=`${state.actionId}:${phase}`
    if(flash.current.key!==key)flash.current={key,elapsed:0}
    if(state.runActive)flash.current.elapsed+=delta*1000
    const flashing=phase!=='ready'&&state.events.some(event=>{
      const delay=impactPresentationDelay(event,state.events,currentForm(state.transformations))
      return event.targetId===enemy.id&&(event.kind==='hit'||event.kind==='counter')&&event.seen
        &&flash.current.elapsed>=delay&&flash.current.elapsed<delay+100
    })
    const hit=phase!=='ready'?state.events.find(event=>event.targetId===enemy.id&&event.kind==='hit'&&event.seen):undefined
    const reaction=hit?targetReaction(flash.current.elapsed,impactPresentationDelay(hit,state.events,currentForm(state.transformations))):0
    const [px,,pz]=gridToWorld(state.cell.column,state.cell.row),dx=b[0]-px,dz=b[2]-pz,length=Math.hypot(dx,dz)||1
    root.current.rotation.set(dz/length*reaction*0.09,0,-dx/length*reaction*0.09)
    root.current.position.x+=dx/length*reaction*0.035;root.current.position.z+=dz/length*reaction*0.035
    material.current?.color.set(flashing ? impactColor : enemy.kind === 'dummy' ? '#97745d' : '#626d78')
  })
  return (
    <group ref={root} name={enemy.id} onClick={(event) => {
      event.stopPropagation()
      const state = usePawnStore.getState()
      if (gameplayBlocked()) { state.recordInputBlocked(); return }
      restoreGameFocus()
      clickEnemy(enemy.id)
    }}>
      {enemy.kind === 'dummy' ? <TrainingDummy materialRef={material} /> : enemy.tactics?<PortaEnemyModel enemy={enemy}/>:<>
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
      {enemy.hp>0 && canSeeContent(cellId(enemy.cell),state) && <Html position={[0, enemy.boss?1.65:enemy.tactics?1.4:enemy.kind==='dummy'?1.20:0.98, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <EnemyHealthBar hp={enemy.hp} maxHp={enemy.maxHp}/>
      </Html>}
    </group>
  )
}

export function DungeonEnemies() {
  const state = usePawnStore()
  const aimingAttack=useInspectionStore(s=>s.aimingAttack)
  const targets = state.phase !== 'ready' || state.status !== 'playing' ? [] : state.selectedCardId ? cardOptions(state, state.selectedCardId).targets
    : state.selectedAbility && state.abilityDestination && !abilityReason(state)
      ? vaultTargets(state, state.abilityDestination, true).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id }))
      : state.selectedAbility && currentForm(state.transformations) === 'king' && !abilityReason(state)
        ? royalDecreeTargets(state).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id }))
      : state.selectedAbility && currentForm(state.transformations) === 'queen'
        ? visibleEnemies(state).filter((enemy) => gridDistance(enemy.cell, state.cell) <= 3).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id })) : state.selectedAbility ? []
          : aimingAttack ? attackTargets(state).map((enemy) => ({ kind: 'enemy' as const, enemyId: enemy.id })) : []
  const presented = state.phase === 'player' ? state.enemies.filter((enemy) => canSeeContent(cellId(enemy.cell), state)
    && (enemy.hp > 0 || state.events.some((event) => event.kind === 'defeat' && event.actor === enemy.id && event.seen))) : visibleEnemies(state)
  return <group name="dungeon-enemies">
    {presented.map((enemy) => (
      <group key={enemy.id}>
        {targets.some((target) => target.kind === 'enemy' && target.enemyId === enemy.id)
          && <group position={gridToWorld(enemy.cell.column, enemy.cell.row)}><LegalTileHighlight attack /></group>}
        <Rookling enemy={enemy} phase={state.phase} interpolate={canSeeContent(cellId(enemy.from), state)} />
        {(enemy.tactics?currentThreat(state,enemy):enemy.intent==='attack'&&enemy.attackTarget?[enemy.attackTarget]:[]).filter(cell=>canSeeContent(cellId(cell),state)).map(cell=>(
          <mesh key={cellId(cell)} raycast={()=>{}} position={gridToWorld(cell.column, cell.row).map((v, i) => i === 1 ? 0.031 : v) as [number, number, number]}
            rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <ringGeometry args={[0.47, 0.55, 4]} />
            <meshBasicMaterial color="#d3a66e" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        ))}
        {enemy.tactics?.pending?.pattern==='shot'&&[enemy.cell,...currentThreat(state,enemy)].slice(1).map((cell,index)=>{
          const previous=[enemy.cell,...currentThreat(state,enemy)][index]
          if(!canSeeContent(cellId(cell),state)||!canSeeContent(cellId(previous),state))return null
          const a=gridToWorld(previous.column,previous.row),b=gridToWorld(cell.column,cell.row)
          return <mesh key={`aim-${index}`} raycast={()=>{}} position={[(a[0]+b[0])/2,0.042,(a[2]+b[2])/2]} rotation={[0,Math.atan2(b[0]-a[0],b[2]-a[2]),0]}>
            <boxGeometry args={[0.018,0.008,Math.hypot(b[0]-a[0],b[2]-a[2])]}/><meshBasicMaterial color="#e1bb80" transparent opacity={0.7} depthWrite={false}/>
          </mesh>
        })}
        {enemy.tactics?.pending?.path.slice(-1).filter(cell=>canSeeContent(cellId(cell),state)&&currentThreat(state,enemy).some(threat=>cellId(threat)===cellId(cell))).map(cell=>
          <mesh key="charge-destination" raycast={()=>{}} position={gridToWorld(cell.column,cell.row).map((v,i)=>i===1?0.052:v) as [number,number,number]} rotation={[-Math.PI/2,0,0]}>
            <circleGeometry args={[0.13,3]}/><meshBasicMaterial color="#e1bb80" transparent opacity={0.85} depthWrite={false}/>
          </mesh>)}
        {(enemy.block??0)>0&&<group position={gridToWorld(enemy.cell.column,enemy.cell.row)}><mesh position={[0,0.045,0]} rotation={[-Math.PI/2,0,0]} raycast={()=>{}}>
          <ringGeometry args={[0.28,0.31,8]}/><meshBasicMaterial color="#a8bdcf" transparent opacity={0.7} depthWrite={false}/>
        </mesh></group>}
      </group>
    ))}
  </group>
}
