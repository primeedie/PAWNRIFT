import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { Enemy } from '../../game/logic/combat'
import { usePawnStore } from '../../game/state/pawnStore'
import { Part, type V } from './CharacterParts'
import { Head } from './ChessHead'
import { CorruptionArmor } from './CorruptionArmor'
import { createArmSolver, armLengths } from '../../utils/characterRig'
import { enemyPresentationDuration } from '../../utils/characterAnimation'

function InfantryArm({side,enemy,target}:{side:-1|1;enemy:Enemy;target:RefObject<Vector3>}){
  const upper=useRef<Group>(null),lower=useRef<Group>(null),hand=useRef<Group>(null),solve=useRef(createArmSolver())
  const shoulder=new Vector3(side*0.18,0.81,0),variant=enemy.variant??'light'
  useFrame(()=>{
    const joints=solve.current(shoulder,target.current.toArray() as V,[0,0,0],side)
    upper.current?.quaternion.copy(joints.upperRotation);lower.current?.quaternion.copy(joints.lowerRotation);hand.current?.quaternion.copy(joints.handRotation)
  },-0.8)
  return <group position={shoulder.toArray() as V}><group ref={upper} name="enemy-shoulder-joint">
    <Part variant={variant} shape={variant==='dark'?'fracturedPlate':'pauldron'} size={[side===-1&&variant==='dark'?0.22:0.16,0.16,0.18]} tone="armor"/>
    <Part variant={variant} shape="upperLimb" size={[0.10,0.24,0.12]} at={[0,-0.12,0]} tone="cloth"/>
    <group ref={lower} position={[0,-armLengths.upper,0]} name="enemy-elbow-joint">
      <Part variant={variant} shape="vambrace" size={[0.13,0.23,0.14]} at={[0,-0.115,0]} tone="metal"/>
      <group ref={hand} name={side===-1?'enemy-left-grip':'enemy-right-grip'} position={[0,-armLengths.forearm,0]}><Part variant={variant} shape="hand" size={[0.09,0.10,0.10]} tone="dark"/></group>
    </group>
  </group></group>
}

export function PortaEnemyModel({enemy}:{enemy:Enemy}){
  const state=usePawnStore(),body=useRef<Group>(null),equipment=useRef<Group>(null),leftLeg=useRef<Group>(null),rightLeg=useRef<Group>(null)
  const phaseMark=useRef<Group>(null)
  const upperBody=useRef<Group>(null)
  const leftKnee=useRef<Group>(null),rightKnee=useRef<Group>(null)
  const headA=useRef<Group>(null),headB=useRef<Group>(null),mane=useRef<Group>(null)
  const left=useRef(new Vector3(-0.19,0.55,0.13)),right=useRef(new Vector3(0.18,0.56,0.15))
  const clock=useRef({key:'',elapsed:0}),variant=enemy.variant??'light',dark=variant==='dark',boss=!!enemy.boss
  const cavalry=boss||enemy.kind==='cavalier',shield=enemy.kind==='shield-guard',bow=enemy.kind==='sentinel',pole=cavalry||enemy.kind==='halberdier'
  const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches
  const attackTarget=enemy.tactics?.pending?.target??enemy.lastSeen??state.cell
  const angle=Math.atan2(attackTarget.column-enemy.cell.column,attackTarget.row-enemy.cell.row)
  useFrame((_,delta)=>{
    const key=`${state.actionId}:${state.phase}`
    if(clock.current.key!==key)clock.current={key,elapsed:0}
    if(state.runActive)clock.current.elapsed+=delta
    const t=Math.min(1,clock.current.elapsed*1000/enemyPresentationDuration(state))
    const strike=state.phase==='enemies'&&state.events.some(event=>(event.actor===enemy.id&&['hit','miss','guard'].includes(event.kind))||event.sourceId===enemy.id)
    const prepare=!!enemy.tactics?.pending,guard=(enemy.block??0)>0
    const hit=strike?Math.sin(Math.PI*Math.min(1,t/0.72)):0
    const changing=state.events.some(event=>event.actor===enemy.id&&event.kind==='phase')&&clock.current.elapsed<0.9
    if(phaseMark.current){phaseMark.current.visible=changing;phaseMark.current.scale.setScalar(reduced?1:0.8+clock.current.elapsed*0.3)}
    const moving=state.phase==='enemies'&&(enemy.from.column!==enemy.cell.column||enemy.from.row!==enemy.cell.row)
    if(body.current){body.current.rotation.set(0,angle,0);body.current.position.y=reduced?0:moving?Math.sin(t*Math.PI)*0.02:Math.sin(clock.current.elapsed*1.8)*0.004}
    if(upperBody.current)upperBody.current.rotation.set(prepare?-0.08:hit*0.16,0,dark?-0.045:0)
    if(equipment.current){
      equipment.current.position.set(bow?0:pole?0.03:0.15,prepare?0.72:0.61,bow?0.25:0.08+hit*0.12)
      equipment.current.rotation.set(bow?0:prepare?-0.32:hit*(pole?0.18:-0.5),0,pole?0:prepare?-0.7:hit*1.2)
      equipment.current.updateMatrix()
      right.current.set(bow?0.14:0,0,0).applyMatrix4(equipment.current.matrix)
      left.current.set(bow?-0.14:pole?0:-0.34,bow?0:pole?0:-0.10,bow?0:pole?0.15:-0.02)
      if(bow||pole)left.current.applyMatrix4(equipment.current.matrix)
      if(shield)left.current.set(-0.24,guard?0.70:0.57,guard?0.30:0.14)
    }
    const stride=reduced||!moving?0:Math.sin(t*Math.PI*2)*0.3
    if(leftLeg.current)leftLeg.current.rotation.x=stride
    if(rightLeg.current)rightLeg.current.rotation.x=-stride
    if(leftKnee.current)leftKnee.current.rotation.x=Math.max(0,-stride)*0.6
    if(rightKnee.current)rightKnee.current.rotation.x=Math.max(0,stride)*0.6
    if(headA.current)headA.current.rotation.x=enemy.kind==='chimera-knight'?hit*0.4:hit*0.08
    if(headB.current)headB.current.rotation.x=-hit*0.3
  },-1)
  const c={variant},height=boss?1.08:0.98
  return <group ref={body} name={`porta-model-${enemy.kind}-${variant}`} scale={boss?1.12:shield?1.02:0.94} dispose={null}>
    {[-1,1].map(side=><group key={side} ref={side===-1?leftLeg:rightLeg} position={[side*0.10,0.40,0]} name="enemy-hip-joint">
      <Part {...c} shape="upperLimb" size={[0.14,0.22,0.16]} at={[0,-0.10,0]} tone="cloth"/>
      <group ref={side===-1?leftKnee:rightKnee} position={[0,-0.19,0]} name="enemy-knee-joint">
        <Part {...c} shape="vambrace" size={[0.14,0.16,0.16]} at={[0,-0.08,0]} tone="armor"/>
        <Part {...c} shape="boot" size={[0.17,0.14,0.23]} at={[0,-0.15,0.045]} tone="dark"/>
      </group>
    </group>)}
    <group ref={upperBody} position={[0,0.49,0]}><group position={[0,-0.49,0]}>
    {cavalry?<CorruptionArmor form="knight" variant={variant}/>:<>
      <Part {...c} shape={dark?'rupturedTorso':'lancerTorso'} size={[shield?0.45:0.32,0.36,0.25]} at={[dark?-0.02:0,0.68,0]} tone="armor" ink/>
      <Part {...c} shape={dark?'voidRegalia':'robe'} size={[shield?0.40:0.32,0.27,0.26]} at={[0,0.40,0]} tone="cloth"/>
    </>}
    <Part {...c} shape="abdomen" size={[0.27,0.065,0.27]} at={[0,0.49,0]} tone="accent"/>
    {enemy.kind==='chimera-knight'?[-1,1].map(side=><group key={side} ref={side===-1?headA:headB} position={[side*0.17,height+(side===1?0.025:-0.025),side===1?-0.04:0.04]} scale={0.79} name={`chimera-horse-head-${side===-1?'left':'right'}`}>
      <Head form="knight" variant="dark" mane={mane}/>
    </group>):<group ref={headA} position={[0,height,0]}>
      {cavalry?<Head form="knight" variant={variant} mane={mane}/>:<>
        <Part {...c} shape={dark?'voidRoyalMask':'helm'} size={[bow?0.24:shield?0.31:0.27,0.27,0.25]} tone="ivory" ink/>
        <Part {...c} size={[0.19,0.027,0.02]} at={[0,0.015,0.135]} tone="dark"/>
        {bow?<Part {...c} shape={dark?'raggedCloth':'cloth'} size={[0.30,0.22,0.36]} at={[0,0.07,-0.06]} tone="cloth"/>:
          <Part {...c} shape={dark?'voidBlade':'plate'} size={[0.045,pole?0.24:0.12,0.13]} at={[dark?-0.08:0,0.18,-0.01]} tone="accent"/>}
      </>}
    </group>}
    <InfantryArm side={-1} enemy={enemy} target={left}/><InfantryArm side={1} enemy={enemy} target={right}/>
    <group ref={equipment} name={`${enemy.kind}-equipment-grip`}>
      <group name="enemy-right-weapon-contact" position={[bow?0.14:0,0,0]}/>
      {(pole||bow)&&<group name="enemy-left-weapon-contact" position={[bow?-0.14:0,0,pole?0.15:0]}/>}
      {bow?<group name="functional-crossbow">
        <Part {...c} size={[0.075,0.065,0.49]} at={[0,0,0.10]} tone="cloth"/>
        {[-1,1].map(side=><Part key={side} {...c} shape={dark?'voidBlade':'leaf'} size={[0.28,0.055,0.10]} at={[side*0.16,0,0.27]} rotate={[0,side*0.25,Math.PI/2]} tone="metal"/>)}
        <Part {...c} size={[0.45,0.012,0.012]} at={[0,0,0.17]} tone="dark" ink={false}/>
        <Part {...c} size={[0.017,0.017,0.30]} at={[0,0.05,0.24]} tone="accent"/>
      </group>:pole?<group name={enemy.kind==='halberdier'?'halberd':'commander-lance'}>
        <Part {...c} shape="cylinder" size={[0.025,1.05,0.025]} at={[0,0,0.30]} rotate={[Math.PI/2,0,0]} tone="dark"/>
        <Part {...c} shape={dark?'voidBlade':'greatblade'} size={[boss?0.12:0.085,0.32,0.035]} at={[0,0,0.94]} rotate={[Math.PI/2,0,0]} tone="metal"/>
        <Part {...c} shape="cone" size={[0.11,0.20,0.11]} at={[0,0,0.20]} rotate={[Math.PI/2,0,0]} tone="accent"/>
        {enemy.kind==='halberdier'&&<Part {...c} shape="axe" size={[0.25,0.20,0.035]} at={[0.07,0,0.76]} rotate={[Math.PI/2,0,0]} tone="metal"/>}
      </group>:<group name="infantry-sword">
        <Part {...c} shape={dark?'voidBlade':'greatblade'} size={[0.085,0.50,0.03]} at={[0,0.29,0]} tone="metal"/>
        <Part {...c} size={[0.19,0.035,0.055]} at={[0,0.025,0]} tone="accent"/>
        <Part {...c} shape="cylinder" size={[0.03,0.15,0.03]} at={[0,-0.055,0]} tone="dark"/>
      </group>}
    </group>
    {shield&&<group position={[-0.24,(enemy.block??0)>0?0.70:0.57,(enemy.block??0)>0?0.34:0.18]} name="broad-guard-shield">
      <Part {...c} shape={dark?'rupturedTorso':'cathedralPlate'} size={[0.40,0.55,0.075]} tone="armor" ink/>
      <Part {...c} shape="plate" size={[0.065,0.35,0.025]} at={[0,0,0.055]} tone="accent"/>
    </group>}
    {boss&&<Part {...c} shape={dark?'raggedCloth':'cloth'} size={[0.42,0.52,0.7]} at={[0,0.57,-0.18]} tone="cloth" ink/>}
    {cavalry&&<Part {...c} shape="plate" size={[0.11,0.10,0.04]} at={[0,0.76,0.18]} tone="accent"/>}
    </group></group>
    <group ref={phaseMark} visible={false} name="boss-phase-transition-mark"><Part {...c} shape={dark?'brokenRing':'ring'} size={[2.4,2.4,1]} at={[0,0.045,0]} rotate={[-Math.PI/2,0,0]} tone="accent" ink={false}/></group>
  </group>
}
