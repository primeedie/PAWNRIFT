import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { characterDesigns, type CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { animationCue, characterPose, presentationDuration, enemyPresentationDuration, parryPresentation } from '../../utils/characterAnimation'
import { usePawnStore } from '../../game/state/pawnStore'
import { SheathedKatana } from './CrimsonKatana'
import { Part, geometry, palettes, effects, mantleGeometry } from './CharacterParts'
import { Weapon } from './CharacterEquipment'
import { createArmSolver, armLengths, handPose } from '../../utils/characterRig'
import type { CharacterPose } from '../../utils/characterAnimation'
import { WeaponStrike } from './WeaponStrike'

function Head({ form, variant, mane }: { form: CharacterForm; variant: Attunement; mane: RefObject<Group | null> }) {
  const dark = variant === 'dark'
  return <group name={`${form}-head`}>
    <Part variant={variant} shape="sphere" size={form === 'rook' ? [0.16, 0.16, 0.16] : [0.18, 0.18, 0.17]} />
    {[-1, 1].map((side) => <Part key={side} variant={variant} size={[0.027, 0.024, 0.012]} at={[side * 0.055, 0, 0.17]} tone="eye" />)}
    {form === 'pawn' && <>
      <Part variant={variant} shape="sphere" size={[0.185, 0.10, 0.18]} at={[0, 0.09, -0.015]} tone="armor" />
      <Part variant={variant} size={[0.22, 0.035, 0.06]} at={[0, 0.035, 0.145]} tone="ivory" />
      <Part variant={variant} size={[0.07, 0.09, 0.10]} at={[-0.145, -0.045, 0.08]} tone="metal" />
      <Part variant={variant} shape="cylinder" size={[0.15,0.035,0.145]} at={[0,-0.15,0]} tone="ivory" />
      <Part variant={variant} shape="plate" size={[0.12,0.075,0.035]} at={[0,0.12,0.14]} tone="metal" />
      <Part variant={variant} size={[0.035,0.13,0.025]} at={[-0.07,0.08,0.16]} rotate={[0,0,-0.25]} tone="accent" />
    </>}
    {form === 'knight' && <>
      <Part variant={variant} size={[0.27, 0.16, 0.24]} at={[0, 0.04, -0.025]} tone="armor" />
      <Part variant={variant} shape="plate" size={[0.20, 0.22, 0.18]} at={[0, -0.025, 0.18]} rotate={[-0.55,0,0]} tone="metal" />
      <Part variant={variant} size={[0.16,0.045,0.04]} at={[0,-0.075,0.29]} tone="dark" />
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="plate" size={[0.08,0.22,0.18]} at={[side*0.145,-0.055,0.045]} rotate={[0,side*0.12,side*0.1]} tone={dark?'armor':'ivory'} />)}
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="cone" size={[0.035, 0.11, 0.04]} at={[side * 0.10, 0.18, -0.035]} tone="ivory" />)}
      <group ref={mane} name="layered-mane">{[0, 1, 2, 3].map((i) => <Part key={i} variant={variant} shape="plate" size={[0.075, 0.18 - i * 0.015, 0.10]} at={[0, 0.19 - i * 0.025, -0.035 - i * 0.075]} rotate={[-0.35,0,0]} tone={i%2?'cloth':'accent'} />)}</group>
    </>}
    {form === 'bishop' && <>
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="mitre" size={[0.30,0.40,0.065]} at={[0,0.20,side*0.075]} rotate={[side*0.10,0,0]} tone={dark?'cloth':'ivory'} />)}
      <Part variant={variant} size={[0.31,0.045,0.23]} at={[0,0.025,0]} tone="accent" />
      <Part variant={variant} size={[0.035,0.24,0.02]} at={[0,0.12,0.115]} tone="metal" />
      {[-1,1].map(s=><group key={s}>
        <Part variant={variant} shape="plate" size={[0.09,0.27,0.065]} at={[s*0.135,-0.025,-0.035]} rotate={[0,s*0.15,s*0.18]} tone="cloth" />
        <Part variant={variant} size={[0.022,0.23,0.02]} at={[s*0.10,0.16,0.118]} rotate={[0,0,s*-0.25]} tone="accent" />
      </group>)}
    </>}
    {form === 'rook' && <>
      <Part variant={variant} size={[0.31, 0.23, 0.29]} at={[0, 0.03, -0.02]} tone="armor" />
      <Part variant={variant} size={[0.19, 0.035, 0.02]} at={[0, 0, 0.136]} tone="dark" />
      {[-1,1].flatMap((x) => [-1,1].map((z) => <Part key={`${x}:${z}`} variant={variant} size={[0.10,0.13,0.11]} at={[x*0.12,0.20,z*0.10]} tone="ivory" />))}
      <Part variant={variant} size={[0.34,0.045,0.32]} at={[0,0.12,0]} tone="metal" />
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="plate" size={[0.07,0.20,0.10]} at={[side*0.15,-0.04,0.12]} tone="metal" />)}
    </>}
    {form === 'queen' && <>
      <Part variant={variant} shape="cylinder" size={[0.17, 0.055, 0.17]} at={[0, 0.13, 0]} tone="metal" />
      <Part variant={variant} shape="cylinder" size={[0.185,0.025,0.185]} at={[0,0.105,0]} tone="accent" />
      {[0, 1, 2, 3, 4].map((i) => <Part key={i} variant={variant} shape="blade" size={[0.065, i === 0 ? 0.21 : 0.17, 0.035]}
        at={[Math.sin(i * Math.PI * 2 / 5) * 0.15, 0.23, Math.cos(i * Math.PI * 2 / 5) * 0.15]} rotate={[0,i*Math.PI*2/5,0]} tone="accent" />)}
      <Part variant={variant} shape="octahedron" size={[0.035, 0.055, 0.025]} at={[0, 0.095, 0.17]} tone="accent" />
      {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.055,0.17,0.04]} at={[s*0.15,-0.04,0.11]} rotate={[0,0,s*-0.18]} tone={dark?'metal':'accent'}/>)}
    </>}
    {form === 'king' && <>
      <Part variant={variant} size={[0.31,0.14,0.26]} at={[0,0.03,-0.01]} tone="armor" />
      <Part variant={variant} shape="cylinder" size={[0.19,0.06,0.18]} at={[0,0.15,0]} tone="metal" />
      {[-1,0,1].map((side) => <Part key={side} variant={variant} shape="blade" size={[0.09,side?0.23:0.34,0.045]} at={[side*0.13,0.25,0.10]} rotate={[0,side*0.2,side*-0.12]} tone="accent" />)}
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="blade" size={[0.09,0.23,0.055]} at={[side*0.13,0.25,-0.11]} tone="metal" />)}
      <Part variant={variant} shape="octahedron" size={[0.04,0.06,0.03]} at={[0,0.16,0.19]} tone={dark?'ivory':'accent'} />
      <Part variant={variant} size={[0.35,0.025,0.29]} at={[0,0.12,0]} tone="accent" />
      {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.085,0.24,0.05]} at={[s*0.15,-0.015,0.10]} rotate={[0,0,s*-0.15]} tone="metal"/>)}
    </>}
  </group>
}

function Arm({form,variant,side,motion,hand}:{form:CharacterForm;variant:Attunement;side:-1|1;motion:RefObject<CharacterPose>;hand:RefObject<Group|null>}) {
  const upper=useRef<Group>(null), elbow=useRef<Group>(null)
  const solve=useRef(createArmSolver()), shoulder=useRef(new Vector3(side*characterDesigns[form].shoulder,0.81,0))
  const heavy=form==='rook'||form==='king'
  useFrame(()=>{
    const socket=handPose(form,motion.current,side,variant),joints=solve.current(shoulder.current,socket.position,socket.rotation,side)
    upper.current?.quaternion.copy(joints.upperRotation)
    elbow.current?.quaternion.copy(joints.lowerRotation)
    hand.current?.quaternion.copy(joints.handRotation)
  },-0.8)
  return <group name={`${side===-1?'left':'right'}-shoulder`} position={[side*characterDesigns[form].shoulder,0.81,0]}>
    <group ref={upper} name="upper-arm-joint">
      <Part variant={variant} shape="plate" size={[heavy?0.23:0.16,0.14,0.22]} at={[side*0.01,-0.015,0]} rotate={[0,0,side*-0.13]} tone="armor" />
      <Part variant={variant} shape="plate" size={[heavy?0.21:0.14,0.06,0.035]} at={[0,-0.01,0.12]} tone="metal" />
      <Part variant={variant} size={[0.095,0.19,0.11]} at={[0,-0.14,0]} tone={form==='bishop'?'cloth':'ivory'} />
      {form==='bishop'&&<Part variant={variant} shape="plate" size={[0.16,0.21,0.15]} at={[0,-0.14,0]} tone="cloth"/>}
      <group ref={elbow} name="elbow-joint" position={[0,-armLengths.upper,0]}>
        <Part variant={variant} shape="sphere" size={[0.062,0.06,0.058]} tone="dark"/>
        <Part variant={variant} shape="plate" size={[0.12,0.10,0.035]} at={[0,0,0.06]} tone="metal"/>
        <Part variant={variant} size={[heavy?0.13:0.10,0.18,0.13]} at={[0,-0.11,0]} tone={variant==='dark'?'armor':'ivory'}/>
        <Part variant={variant} size={[0.13,0.026,0.15]} at={[0,-0.19,0]} tone="accent"/>
        {variant==='dark'&&<Part variant={variant} shape="plate" size={[0.15,0.14,0.04]} at={[side*0.025,-0.11,0.075]} tone="metal"/>}
        <group ref={hand} name="wrist-and-grip" position={[0,-armLengths.forearm,0]}>
          <Part variant={variant} size={[0.085,0.092,0.09]} tone="ivory"/>
          <Part variant={variant} size={[0.035,0.06,0.055]} at={[-side*0.045,0.016,0.025]} tone="ivory"/>
          {(side===1||form==='queen'||form==='bishop')&&<Weapon form={form} variant={variant} side={side}/>}
        </group>
      </group>
    </group>
  </group>
}

function Leg({variant,side,heavy,motion}:{variant:Attunement;side:-1|1;heavy:boolean;motion:RefObject<CharacterPose>}) {
  const thigh=useRef<Group>(null), knee=useRef<Group>(null)
  useFrame(()=>{
    const p=motion.current,stride=side===-1?p.leftLeg:p.rightLeg
    if(thigh.current) thigh.current.rotation.x=stride-p.crouch*3
    if(knee.current) knee.current.rotation.x=Math.max(0,-stride)*0.8+p.crouch*6
  },-0.8)
  return <group position={[side*(heavy?0.115:0.085),0.40,side*0.015]}>
    <group ref={thigh} name="hip-joint">
      <Part variant={variant} size={[heavy?0.14:0.11,0.18,0.13]} at={[0,-0.08,0]} tone="cloth"/>
      <group ref={knee} name="knee-joint" position={[0,-0.17,0]}>
        <Part variant={variant} shape="sphere" size={[0.065,0.055,0.06]} tone="dark"/>
        <Part variant={variant} shape="plate" size={[heavy?0.15:0.11,0.12,0.04]} at={[0,-0.025,0.08]} tone="metal"/>
        <Part variant={variant} size={[0.105,0.13,0.12]} at={[0,-0.075,0]} tone="armor"/>
        <Part variant={variant} size={[0.14,0.10,0.22]} at={[0,-0.15,0.045]} tone="dark"/>
        <Part variant={variant} size={[0.14,0.028,0.10]} at={[0,-0.15,0.11]} tone="metal"/>
      </group>
    </group>
  </group>
}

export function CharacterModel({form,variant,reducedMotion=false}:{form:CharacterForm;variant:Attunement;reducedMotion?:boolean}) {
  const state=usePawnStore(), design=characterDesigns[form],heavy=form==='rook'||form==='king'
  const body=useRef<Group>(null),torso=useRef<Group>(null),head=useRef<Group>(null),cape=useRef<Group>(null),mane=useRef<Group>(null)
  const rightHand=useRef<Group>(null),leftHand=useRef<Group>(null),barrier=useRef<Group>(null),pulse=useRef<Group>(null),decree=useRef<Group>(null)
  const intro=useRef(0),motion=useRef({key:'',elapsed:0}),pose=useRef(characterPose(form,'idle',0))
  const cue=animationCue(state,state.phase)
  useFrame(({clock},delta)=>{
    const key=`${state.actionId}:${state.phase}:${cue}:${form}:${variant}`
    if(motion.current.key!==key) motion.current={key,elapsed:0}
    if(state.runActive) motion.current.elapsed+=delta*1000
    intro.current+=delta*1000
    const t=motion.current.elapsed/(state.phase==='enemies'?enemyPresentationDuration(state):presentationDuration(state))
    const parry=state.phase==='enemies'?parryPresentation(state,motion.current.elapsed):undefined
    pose.current=characterPose(form,parry?'parry':cue==='idle'&&state.training&&intro.current<340?'transform':cue,parry?.progress??(cue==='idle'&&state.training?intro.current/340:t),reducedMotion,variant)
    const p=pose.current
    if(form==='pawn'&&state.signatures.samuraiCharges>0){p.crouch+=0.012;p.lean-=0.025}
    if(body.current){body.current.position.set(p.hip,(reducedMotion?0:Math.sin(clock.elapsedTime*(form==='rook'?1.3:form==='queen'?1.9:2.1))*0.004)-p.crouch,0);body.current.scale.setScalar(p.scale)}
    if(torso.current)torso.current.rotation.set(p.lean,p.twist,form==='queen'?-0.025:0)
    if(head.current)head.current.rotation.set(p.head,-p.twist*0.65,0)
    if(cape.current)cape.current.rotation.x=p.cape+(reducedMotion?0:Math.sin(clock.elapsedTime*1.6)*0.02)
    if(mane.current)mane.current.rotation.x=reducedMotion?0:p.leftLeg*0.12+p.lean*0.3
    if(barrier.current)barrier.current.visible=p.guard>0&&heavy
    if(pulse.current){pulse.current.visible=p.pulse>0.08;pulse.current.scale.setScalar(0.9+p.pulse*0.15)}
    if(decree.current){decree.current.visible=!reducedMotion&&state.phase==='enemies'&&state.events.some(e=>e.breakdown?.source==='Royal Decree');decree.current.scale.setScalar(0.35+Math.min(1,t)*2.1)}
  },-1)
  return <group ref={body} name={`humanoid-${form}-${variant}`} dispose={null}>
    {[-1,1].map(s=><Leg key={s} variant={variant} side={s as -1|1} heavy={heavy} motion={pose}/>)}
    <Part variant={variant} size={[design.chest[0],0.13,0.20]} at={[0,0.45,0]} tone="cloth"/>
    <group ref={torso} name="articulated-torso">
      <Part variant={variant} size={design.chest} at={[0,0.68,0]} tone={form==='bishop'?'cloth':'armor'}/>
      <Part variant={variant} shape="plate" size={[design.chest[0]*0.82,design.chest[1]*0.68,0.045]} at={[0,0.71,design.chest[2]/2+0.015]} tone={variant==='dark'?'metal':'ivory'}/>
      <Part variant={variant} size={[design.chest[0]*0.95,0.045,0.24]} at={[0,0.49,0]} tone="dark"/>
      <Part variant={variant} shape="plate" size={[0.075,0.08,0.04]} at={[0,0.49,0.15]} tone="accent"/>
      <Part variant={variant} shape="cylinder" size={[0.135,0.045,0.13]} at={[0,0.88,0]} tone="metal"/>
      {/* Layered asymmetric trim is geometry, retained at normal gameplay scale. */}
      {[-1,1].map(s=><group key={s}>
        <Part variant={variant} shape="plate" size={[heavy?0.20:0.13,0.24,0.035]} at={[s*design.chest[0]*0.30,0.42,0.13]} rotate={[0,s*0.1,s*-0.09]} tone={variant==='dark'?'armor':'cloth'}/>
        <Part variant={variant} shape="plate" size={[0.045,0.20,0.04]} at={[s*0.09,0.71,design.chest[2]/2+0.04]} rotate={[0,0,s*0.12]} tone="accent"/>
        {variant==='dark'&&form!=='pawn'&&<Part variant={variant} shape="plate" size={[0.12,0.15,0.05]} at={[s*design.shoulder,0.84,0.10]} rotate={[0,0,s*-0.3]} tone="armor"/>}
      </group>)}
      <group ref={head} position={[0,design.headY,0]}><Head form={form} variant={variant} mane={mane}/></group>
      <Arm form={form} variant={variant} side={-1} motion={pose} hand={leftHand}/>
      <Arm form={form} variant={variant} side={1} motion={pose} hand={rightHand}/>
      {(form==='pawn'||form==='king'||form==='queen')&&<group ref={cape} position={[form==='pawn'?0.105:0,0.84,-0.14]} scale={form==='king'?[1.4,1.6,1]:form==='queen'?[1,1.4,1]:1}>
        <mesh geometry={mantleGeometry} material={palettes[variant].cloth}/>
        <Part variant={variant} shape="plate" size={[0.23,0.08,0.025]} at={[0,-0.03,-0.01]} tone="metal"/>
      </group>}
      {form==='pawn'&&<><Part variant={variant} shape="octahedron" size={[0.045,0.04,0.035]} at={[0.14,0.83,0.08]} tone="metal"/><SheathedKatana motion={pose} hand={rightHand}/></>}
      {form==='bishop'&&<>
        {[-1,0,1].map(s=><group key={s}>
          <Part variant={variant} shape="plate" size={[0.17,0.47,0.19]} at={[s*0.12,0.34,-0.015]} rotate={[0,s*0.1,s*-0.08]} tone={s?'cloth':'armor'}/>
          <Part variant={variant} size={[0.025,0.38,0.025]} at={[s*0.12,0.34,0.09]} tone="accent"/>
        </group>)}
        <Part variant={variant} shape="plate" size={[0.25,0.19,0.08]} at={[0,0.82,-0.09]} tone="cloth"/>
      </>}
      {heavy&&<>
        {[0,1,2].map(i=><Part key={i} variant={variant} shape="plate" size={[0.35-i*0.03,0.12,0.045]} at={[0,0.76-i*0.075,0.17+i*0.012]} tone={i===1?'armor':'metal'}/>)}
        {form==='king'&&<Part variant={variant} shape="plate" size={[0.15,0.22,0.05]} at={[0,0.67,0.23]} tone="accent"/>}
      </>}
      {form==='queen'&&<Part variant={variant} shape="octahedron" size={[0.05,0.08,0.035]} at={[0,0.78,0.16]} tone="accent"/>}
      <group ref={barrier} visible={false} name="temporary-guard-geometry">
        {[-1,0,1].map(s=><Part key={s} variant={variant} size={[0.13,0.25,0.035]} at={[s*0.13,0.64,0.24]} rotate={[0,s*0.25,0]} tone="accent"/>)}
      </group>
    </group>
    <group ref={pulse} visible={false} name={`${form}-signature-emphasis`}>
      <mesh geometry={geometry.ring} material={form==='pawn'?effects.samurai:effects[variant]} position={form==='bishop'?[0,1.26,0.1]:[0,0.05,0]} rotation={form==='bishop'?[0,0,0]:[-Math.PI/2,0,0]} scale={form==='bishop'?1:2.8}/>
    </group>
    {form==='king'&&<group ref={decree} visible={false} name="resolved-royal-decree-wave"><mesh geometry={geometry.ring} material={effects[variant]} position={[0,0.035,0]} rotation={[-Math.PI/2,0,0]} scale={7}/></group>}
    {form==='pawn'&&state.signatures.samuraiCharges>0&&<group name="samurai-protection-marks">{Array.from({length:state.signatures.samuraiCharges},(_,i)=><mesh key={i} geometry={geometry.blade} material={effects.samurai} position={[(i-1)*0.07,0.51,0.16]} scale={[0.025,0.075,0.025]}/>)}</group>}
    <WeaponStrike form={form} variant={variant} rightHand={rightHand} leftHand={leftHand} reducedMotion={reducedMotion}/>
  </group>
}
