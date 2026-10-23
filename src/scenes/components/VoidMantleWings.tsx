import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import type { CharacterPose } from '../../utils/characterAnimation'
import { voidMantlePose } from '../../utils/voidMantle'
import { Part } from './CharacterParts'
import { geometry, palettes } from './CharacterParts'
import { InkedMesh } from './InkedMesh'

function Wing({side,motion,strikeOrigin}:{side:-1|1;motion:RefObject<CharacterPose>;strikeOrigin?:RefObject<Group|null>}){
  const shoulder=useRef<Group>(null),hinge=useRef<Group>(null),link=useRef<Group>(null)
  const upper=useRef<Group>(null),lower=useRef<Group>(null),scratch=useRef({axis:new Vector3(0,1,0),joint:new Vector3(),end:new Vector3(),direction:new Vector3()})
  useFrame(()=>{
    const p=voidMantlePose(motion.current,side)
    shoulder.current?.rotation.set(...p.shoulder);hinge.current?.rotation.set(...p.hinge)
    if(link.current)link.current.position.set(side*p.spread,0,p.advance)
    const s=scratch.current;s.joint.set(...p.joint);s.end.set(side*p.spread,0,p.advance)
    if(upper.current){upper.current.position.copy(s.joint).multiplyScalar(0.5);upper.current.quaternion.setFromUnitVectors(s.axis,s.direction.copy(s.joint).normalize())}
    if(lower.current){lower.current.position.copy(s.joint).add(s.end).multiplyScalar(0.5);lower.current.quaternion.setFromUnitVectors(s.axis,s.direction.copy(s.end).sub(s.joint).normalize())}
  },-0.7)
  return <group ref={shoulder} name={`${side<0?'left':'right'}-mantle-shoulder`} position={[side*0.17,0.80,-0.12]}>
    <Part variant="dark" shape="pauldron" size={[0.15,0.16,0.15]} tone="metal"/>
    {[upper,lower].map((ref,i)=><group key={i} ref={ref} scale={[0.065,0.48,0.075]}><InkedMesh geometry={geometry.vambrace} material={palettes.dark.armor}/></group>)}
    <group ref={link} position={[side*0.08,0,0]}>
      <Part variant="dark" shape="fracturedPlate" size={[0.22,0.16,0.25]} at={[side*0.02,-0.03,-0.01]} rotate={[0,side*0.25,side*-0.18]} tone="armor"/>
      <group ref={hinge} name="mantle-blade-hinge">
        {[0,1,2].map(i=><group key={i} name={`segmented-wing-edge-${i}`} position={[side*(i-1)*0.07,-i*0.015,-i*0.035]} rotation={[0,side*i*0.12,Math.PI+side*(i-1)*0.17]}>
          {side===1&&i===1&&<group ref={strikeOrigin} name="mantle-cutting-edge-socket" position={[0,0.64,0]}/>}
          <Part variant="dark" shape="voidBlade" size={[0.11-i*0.012,(side===-1&&i===2?0.52:0.78)-i*0.03,0.045]} at={[0,0.29,0]} tone={i===1?'metal':'armor'} ink/>
          <Part variant="dark" shape="blade" size={[0.016,0.31,0.052]} at={[0.02,0.23,0]} tone="accent" ink={false}/>
        </group>)}
      </group>
    </group>
  </group>
}
export function VoidMantleWings({motion,strikeOrigin}:{motion:RefObject<CharacterPose>;strikeOrigin?:RefObject<Group|null>}){
  return <group name="bladed-void-mantle-wings"><Wing side={-1} motion={motion}/><Wing side={1} motion={motion} strikeOrigin={strikeOrigin}/></group>
}
