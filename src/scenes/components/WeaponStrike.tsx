import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Quaternion, Vector3 } from 'three'
import type { Attunement } from '../../data/forms'
import type { CharacterForm } from '../../data/characterDesigns'
import { usePawnStore } from '../../game/state/pawnStore'
import { canSeeContent } from '../../game/logic/visibility'
import { cellId } from '../../game/logic/dungeon'
import { gridToWorld } from '../../utils/grid'
import { impactPresentationDelay } from '../../utils/combatPresentation'
import { geometry, effects, palettes } from './CharacterParts'

// Bounded presentation of already-resolved events. No timers, RNG, callbacks to
// the resolver, or independent damage. World endpoints do not rotate with the rig.
export function WeaponStrike({form,variant,rightHand,castOrigin,wingOrigin,reducedMotion}:{form:CharacterForm;variant:Attunement;rightHand:RefObject<Group|null>;castOrigin:RefObject<Group|null>;wingOrigin?:RefObject<Group|null>;reducedMotion:boolean}) {
  const state=usePawnStore(),bolt=useRef<Group>(null),impact=useRef<Group>(null),trail=useRef<Group>(null)
  const scratch=useRef({key:'',elapsed:0,captured:false,origin:new Vector3(),target:new Vector3(),point:new Vector3(),direction:new Vector3(),up:new Vector3(0,1,0),rotation:new Quaternion(),parent:new Quaternion()})
  useFrame((_,delta)=>{
    if(!bolt.current||!impact.current||!trail.current) return
    bolt.current.visible=impact.current.visible=trail.current.visible=false
    const s=scratch.current,key=`${state.actionId}:${state.phase}:${form}:${variant}`
    if(key!==s.key){s.key=key;s.elapsed=0;s.captured=false}
    if(!state.runActive||reducedMotion)return
    s.elapsed+=delta*1000
    const event=state.events.find(e=>e.actor==='pawn'&&(e.kind==='hit'||e.kind==='counter')&&e.breakdown?.category!=='dot'&&e.breakdown?.source!=='Swish splash'&&e.effect!=='sharpener')
    if(!event?.seen||!canSeeContent(cellId(event.cell),state)||state.phase==='ready')return
    const parent=bolt.current.parent
    if(!parent)return
    parent.updateWorldMatrix(true,false)
    const impactMs=impactPresentationDelay(event,state.events,form)
    const flight=100,launch=Math.max(0,impactMs-flight),t=(s.elapsed-launch)/flight
    const [x,,z]=gridToWorld(event.cell.column,event.cell.row)
    s.target.set(x,0.62,z)
    if(form==='bishop'||(form==='knight'&&Math.max(Math.abs(event.cell.column-state.cell.column),Math.abs(event.cell.row-state.cell.row))===2)) {
      const socket=form==='bishop'?castOrigin.current:rightHand.current
      if(t>=0&&t<=1&&socket){
        if(!s.captured){
          socket.updateWorldMatrix(true,false)
          s.origin.set(0,form==='bishop'?0:0.89,0)
          socket.localToWorld(s.origin);s.captured=true
        }
        s.point.lerpVectors(s.origin,s.target,Math.min(1,t));parent.worldToLocal(s.point)
        bolt.current.position.copy(s.point)
        s.direction.copy(s.target);parent.worldToLocal(s.direction)
        s.direction.sub(s.point).normalize()
        if(s.direction.lengthSq()>0.1)bolt.current.quaternion.setFromUnitVectors(s.up,s.direction)
        bolt.current.visible=true
      }
    }
    if(s.elapsed>=impactMs&&s.elapsed<impactMs+110){
      impact.current.position.copy(parent.worldToLocal(s.point.copy(s.target)))
      impact.current.scale.setScalar(0.7+(s.elapsed-impactMs)/110*0.5)
      impact.current.visible=true
    }
    if((form==='queen'||form==='rook'||form==='king')&&s.elapsed>impactMs-65&&s.elapsed<impactMs+110){
      const socket=form==='queen'&&variant==='dark'?wingOrigin?.current:rightHand.current
      if(socket){socket.updateWorldMatrix(true,false)
        s.point.set(0,form==='queen'?(variant==='dark'?0:0.26):form==='rook'?0.50:0.62,0);socket.localToWorld(s.point);parent.worldToLocal(s.point)
        trail.current.position.copy(s.point);socket.getWorldQuaternion(s.rotation);parent.getWorldQuaternion(s.parent).invert()
        trail.current.quaternion.copy(s.parent.multiply(s.rotation));trail.current.visible=true
      }
    }
  },-0.4)
  return <group name="resolved-weapon-contact" dispose={null}>
    <group ref={bolt} visible={false} name={form==='bishop'?'equipment-magic-bolt':'narrow-lance-projection'}>
      <mesh geometry={form==='bishop'?geometry.octahedron:geometry.blade} material={form==='bishop'?palettes[variant].accent:palettes[variant].metal} scale={form==='bishop'?[0.07,0.13,0.07]:[0.055,0.30,0.035]}/>
    </group>
    <group ref={impact} visible={false} name="weapon-impact">
      <mesh geometry={form==='queen'&&variant==='dark'?geometry.octahedron:geometry.ring} material={effects[variant]} rotation={[-Math.PI/2,0,0]} scale={form==='queen'&&variant==='dark'?0.16:form==='rook'||form==='king'?1.5:0.85}/>
    </group>
    <group ref={trail} visible={false} name="weapon-edge-trail"><mesh geometry={geometry.arc} material={effects[variant]} rotation={[0,0,-0.3]}/></group>
  </group>
}
