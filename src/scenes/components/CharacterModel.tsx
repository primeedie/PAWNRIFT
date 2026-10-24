import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { characterDesigns, type CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { animationCue, characterPose, presentationDuration, enemyPresentationDuration, parryPresentation, type AnimationCue, type CharacterPose } from '../../utils/characterAnimation'
import { usePawnStore } from '../../game/state/pawnStore'
import { SheathedKatana } from './CrimsonKatana'
import { Part, geometry, palettes, effects, roninPalette } from './CharacterParts'
import { Weapon } from './CharacterEquipment'
import { Head } from './ChessHead'
import { CorruptionArmor } from './CorruptionArmor'
import { createArmSolver, armLengths, handPose } from '../../utils/characterRig'
import { WeaponStrike } from './WeaponStrike'
import { VoidMantleWings } from './VoidMantleWings'
import { InkedMesh } from './InkedMesh'

export type ModelPreview={cue:AnimationCue;progress:number;time:number}
type Motion=RefObject<CharacterPose>
function Arm({form,variant,side,motion,hand,castOrigin}:{form:CharacterForm;variant:Attunement;side:-1|1;motion:Motion;hand:RefObject<Group|null>;castOrigin:RefObject<Group|null>}){
  const upper=useRef<Group>(null),elbow=useRef<Group>(null),solve=useRef(createArmSolver())
  const shoulder=useRef(new Vector3(side*characterDesigns[form].shoulder,0.81,0)),heavy=form==='rook'||form==='king',costume={variant,ronin:form==='pawn'}
  useFrame(()=>{
    const socket=handPose(form,motion.current,side,variant),joints=solve.current(shoulder.current,socket.position,socket.rotation,side)
    upper.current?.quaternion.copy(joints.upperRotation);elbow.current?.quaternion.copy(joints.lowerRotation);hand.current?.quaternion.copy(joints.handRotation)
  },-0.8)
  return <group name={`${side===-1?'left':'right'}-shoulder`} position={[side*characterDesigns[form].shoulder,0.81,0]}>
    <group ref={upper} name="upper-arm-joint">
      <Part {...costume} shape={form==='rook'?'towerHelm':form==='king'?'royalTorso':'pauldron'} size={[form==='pawn'?0.115:heavy?0.22:form==='bishop'?0.13:0.15,form==='pawn'?0.095:heavy?0.15:0.12,form==='pawn'?0.13:heavy?0.23:0.18]} at={[side*0.01,-0.01,0]} rotate={[0,0,side*(variant==='dark'&&side===-1?-0.3:-0.17)]} tone={form==='pawn'?'armor':variant==='light'?'ivory':'metal'}/>
      <Part {...costume} shape="upperLimb" size={[heavy?0.14:form==='queen'?0.085:0.105,0.23,form==='queen'?0.10:0.13]} at={[0,-0.13,0]} tone="cloth"/>
      {form==='bishop'&&<Part {...costume} shape="raggedCloth" size={[0.18,0.25,0.2]} at={[0,-0.14,-0.04]} tone={variant==='dark'?'cloth':'ivory'}/>}
      <group ref={elbow} name="elbow-joint" position={[0,-armLengths.upper,0]}>
        <Part {...costume} shape="sphere" size={[0.053,0.052,0.052]} tone="dark" ink={false}/>
        <Part {...costume} shape="vambrace" size={[heavy?0.155:0.125,0.21,0.15]} at={[0,-0.115,0]} tone={form==='pawn'?'armor':variant==='dark'?'metal':'ivory'}/>
        <Part {...costume} shape="plate" size={[0.1,0.15,0.025]} at={[0,-0.11,0.072]} tone="metal"/>
        <Part {...costume} size={[0.12,0.022,0.135]} at={[0,-0.20,0]} tone="accent"/>
        <group ref={hand} name="wrist-and-grip" position={[0,-armLengths.forearm,0]}>
          <Part {...costume} shape="hand" size={[0.09,0.1,0.1]} tone={form==='pawn'?'dark':'armor'}/>
          <Part {...costume} shape="upperLimb" size={[0.032,0.058,0.047]} at={[-side*0.041,0.004,0.025]} rotate={[0,0,side*-0.5]} tone={form==='pawn'?'dark':'armor'}/>
          <Weapon form={form} variant={variant} side={side} motion={motion} castOrigin={castOrigin}/>
        </group>
      </group>
    </group>
  </group>
}
function Leg({form,variant,side,motion}:{form:CharacterForm;variant:Attunement;side:-1|1;motion:Motion}){
  const thigh=useRef<Group>(null),knee=useRef<Group>(null),heavy=form==='rook'||form==='king',costume={variant,ronin:form==='pawn'}
  useFrame(()=>{
    const p=motion.current,stride=side===-1?p.leftLeg:p.rightLeg
    if(thigh.current)thigh.current.rotation.set(stride-p.crouch*3,side*(form==='queen'?0.13:0.06),side*(heavy?0.08:0.025))
    if(knee.current)knee.current.rotation.x=Math.max(0,-stride)*0.8+p.crouch*6
  },-0.8)
  return <group position={[side*(heavy?0.115:0.085),0.40,side*(form==='pawn'?0.035:0.015)]}>
    <group ref={thigh} name="hip-joint">
      <Part {...costume} shape="upperLimb" size={[heavy?0.17:0.135,0.2,0.15]} at={[0,-0.08,0]} tone="cloth"/>
      <group ref={knee} name="knee-joint" position={[0,-0.17,0]}>
        <Part {...costume} shape="sphere" size={[0.055,0.05,0.055]} tone="dark" ink={false}/>
        <Part {...costume} shape="vambrace" size={[heavy?0.16:0.12,0.14,0.14]} at={[0,-0.065,0]} tone="armor"/>
        <Part {...costume} shape="plate" size={[heavy?0.14:0.105,0.12,0.03]} at={[0,-0.015,0.072]} tone="metal"/>
        <Part {...costume} shape="boot" size={[0.15,0.15,0.23]} at={[0,-0.13,0.038]} tone="dark" ink/>
      </group>
    </group>
  </group>
}
export function CharacterModel({form,variant,reducedMotion=false,preview}:{form:CharacterForm;variant:Attunement;reducedMotion?:boolean;preview?:RefObject<ModelPreview>}){
  variant=form==='pawn'?'light':variant
  const state=usePawnStore(),design=characterDesigns[form],heavy=form==='rook'||form==='king',costume={variant,ronin:form==='pawn'}
  const body=useRef<Group>(null),torso=useRef<Group>(null),head=useRef<Group>(null),cape=useRef<Group>(null),mane=useRef<Group>(null)
  const rightHand=useRef<Group>(null),leftHand=useRef<Group>(null),castOrigin=useRef<Group>(null),barrier=useRef<Group>(null),pulse=useRef<Group>(null),decree=useRef<Group>(null)
  const wingOrigin=useRef<Group>(null)
  const motion=useRef({key:'',elapsed:0}),pose=useRef(characterPose(form,'idle',0))
  useFrame(({clock},delta)=>{
    const cue=preview?.current.cue??animationCue(state,state.phase)
    const key=`${state.actionId}:${state.phase}:${cue}:${form}:${variant}`
    if(motion.current.key!==key)motion.current={key,elapsed:0}
    if(state.runActive&&!preview)motion.current.elapsed+=delta*1000
    const t=preview?.current.progress??motion.current.elapsed/(state.phase==='enemies'?enemyPresentationDuration(state):presentationDuration(state))
    const parry=!preview&&state.phase==='enemies'?parryPresentation(state,motion.current.elapsed):undefined
    pose.current=characterPose(form,parry?'parry':cue,parry?.progress??t,reducedMotion,variant)
    const p=pose.current,time=preview?.current.time??clock.elapsedTime
    const target=!preview?state.events.find(event=>event.actor==='pawn'&&event.kind==='hit'&&event.seen&&event.breakdown?.category!=='dot')?.cell:undefined
    if(target)p.reach=Math.min(Math.SQRT2,Math.hypot(target.column-state.cell.column,target.row-state.cell.row))
    if(!preview&&form==='pawn'&&state.signatures.samuraiCharges>0){p.crouch+=0.018;p.lean-=0.035}
    if(!preview&&form==='rook'&&state.fortified&&(cue==='idle'||cue==='defend'||cue==='signature')){p.guard=1;p.crouch+=0.012}
    if(body.current){body.current.position.set(p.hip,(reducedMotion?0:Math.sin(time*(form==='rook'?1.3:form==='queen'?1.9:2.1))*0.004)-p.crouch,0);body.current.scale.setScalar(p.scale)}
    if(torso.current)torso.current.rotation.set(p.lean,p.twist,form==='queen'?-0.025:0)
    if(head.current)head.current.rotation.set(p.head,-p.twist*0.65,0)
    if(cape.current)cape.current.rotation.x=p.cape+(reducedMotion?0:Math.sin(time*1.6)*0.025)
    if(mane.current)mane.current.rotation.x=reducedMotion?0:p.leftLeg*0.12+p.lean*0.3
    if(barrier.current)barrier.current.visible=p.guard>0&&heavy
    if(pulse.current){pulse.current.visible=p.pulse>0.08;pulse.current.scale.setScalar(0.9+p.pulse*0.15)}
    if(decree.current){decree.current.visible=!reducedMotion&&(preview?cue==='signature'&&t>0.65:state.phase==='enemies'&&state.events.some(e=>e.breakdown?.source==='Royal Decree'));decree.current.scale.setScalar(0.35+Math.min(1,t)*2.1)}
  },-1)
  return <group ref={body} name={`humanoid-${form}-${variant}`} dispose={null}>
    {[-1,1].map(s=><Leg key={s} form={form} variant={variant} side={s as -1|1} motion={pose}/>)}
    <Part {...costume} shape="abdomen" size={[design.chest[0],0.18,0.22]} at={[0,0.46,0]} tone="cloth"/>
    <group ref={torso} name="articulated-torso">
      {form==='pawn'?<><Part {...costume} shape="cuirass" size={design.chest} at={[0,0.68,0]} tone="armor"/>
        <Part {...costume} shape="raggedCloth" size={[0.18,0.32,0.32]} at={[-0.045,0.67,0.11]} rotate={[0,0,-0.13]} tone="cloth"/>
        {[-1,1].map(s=><Part key={s} {...costume} shape="raggedCloth" size={[0.14,0.25,0.28]} at={[s*0.09,0.38,0.12]} rotate={[0,s*0.1,s*-0.09]} tone="cloth"/>)}</>:<CorruptionArmor form={form} variant={variant}/>}
      <Part {...costume} shape="abdomen" size={[design.chest[0]*1.05,0.075,0.27]} at={[0,0.49,0]} tone={form==='pawn'?'accent':'dark'}/>
      <Part {...costume} shape="plate" size={[0.06,0.07,0.025]} at={[0,0.49,0.14]} tone="metal"/>
      <Part {...costume} shape="abdomen" size={[0.17,0.08,0.17]} at={[0,0.88,0]} tone="dark"/>
      <group ref={head} position={[0,design.headY,0]}><Head form={form} variant={variant} mane={mane}/></group>
      <Arm form={form} variant={variant} side={-1} motion={pose} hand={leftHand} castOrigin={castOrigin}/>
      <Arm form={form} variant={variant} side={1} motion={pose} hand={rightHand} castOrigin={castOrigin}/>
      {(form==='pawn'||form==='king'||form==='queen'&&variant==='light')&&<group ref={cape} position={[form==='pawn'?0.105:0,0.82,-0.14]}>
        <group position={[form==='pawn'?0.04:0,-(form==='king'?0.23:0.13),0]} rotation={[0,0,form==='pawn'?-0.2:0]} scale={form==='king'?[0.48,0.62,1.2]:form==='queen'?[0.36,0.45,1]:[0.32,0.34,1]}>
          <InkedMesh geometry={variant==='dark'||form==='pawn'?geometry.raggedCloth:geometry.cloth} material={form==='pawn'?roninPalette.ivory:palettes[variant].cloth}/>
        </group><Part {...costume} shape="plate" size={[0.16,0.06,0.025]} at={[0,-0.02,-0.01]} tone="metal"/>
      </group>}
      {form==='queen'&&variant==='dark'&&<VoidMantleWings motion={pose} strikeOrigin={wingOrigin}/>}
      {form==='pawn'&&<SheathedKatana motion={pose} hand={rightHand}/>}
      <group ref={barrier} visible={false} name="temporary-guard-geometry">
        {[-1,0,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.13,0.25,0.035]} at={[s*0.13,0.64,0.24]} rotate={[0,s*0.25,0]} tone="accent"/>)}
      </group>
    </group>
    <group ref={pulse} visible={false} name={`${form}-signature-emphasis`}>
      <mesh geometry={geometry.ring} material={form==='pawn'?effects.samurai:effects[variant]} position={form==='bishop'?[0,1.26,0.1]:[0,0.05,0]} rotation={form==='bishop'?[0,0,0]:[-Math.PI/2,0,0]} scale={form==='bishop'?1:2.8}/>
    </group>
    {form==='king'&&<group ref={decree} visible={false} name="resolved-royal-decree-wave"><mesh geometry={geometry.ring} material={effects[variant]} position={[0,0.035,0]} rotation={[-Math.PI/2,0,0]} scale={7}/></group>}
    {!preview&&form==='pawn'&&state.signatures.samuraiCharges>0&&<group name="samurai-protection-marks">{Array.from({length:state.signatures.samuraiCharges},(_,i)=><mesh key={i} geometry={geometry.blade} material={effects.samurai} position={[(i-1)*0.07,0.51,0.16]} scale={[0.025,0.075,0.025]}/>)}</group>}
    {!preview&&<WeaponStrike form={form} variant={variant} rightHand={rightHand} castOrigin={castOrigin} wingOrigin={wingOrigin} reducedMotion={reducedMotion}/>}
  </group>
}
