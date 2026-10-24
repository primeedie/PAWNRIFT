import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { CharacterForm } from '../data/characterDesigns'
import type { CharacterPose } from './characterAnimation'
import type { Attunement } from '../data/forms'

export type Triple = [number,number,number]
export const armLengths = { upper: 0.25, forearm: 0.24 } as const
export const katanaMount: Triple = [-0.22,0.60,0.12]
export const katanaRest: Triple = [-1.72,0,0.58]
export const katanaScale = 0.70
const sheathAxis=new Vector3(0,1,0).applyEuler(new Euler(...katanaRest))
export function sheathPosition(draw:number):Triple {
  return [katanaMount[0]+sheathAxis.x*0.30*draw,katanaMount[1]+sheathAxis.y*0.30*draw,katanaMount[2]+sheathAxis.z*0.30*draw]
}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
const aimPoint=new Vector3(),aimOrientation=new Quaternion(),aimEuler=new Euler()
const surfaceX=new Vector3(),surfaceY=new Vector3(),surfaceZ=new Vector3(),surfaceBasis=new Matrix4(),surfaceQuaternion=new Quaternion(),surfaceBase=new Quaternion(),surfaceBlend=new Quaternion(),surfaceEuler=new Euler()
function surfaceGrip(p:CharacterPose,rotation:Triple,weight:number):Triple{
  // Local +X is the hammer's striking face / sword's cutting edge. The shaft or
  // blade length follows +Y; +Z is the sword's broad flat, perpendicular to travel.
  aimOrientation.setFromEuler(aimEuler.set(p.lean,p.twist,0)).invert()
  surfaceX.set(0,-0.85,0.52).normalize().applyQuaternion(aimOrientation)
  surfaceY.set(0,0.52,0.85).normalize().applyQuaternion(aimOrientation)
  surfaceZ.crossVectors(surfaceX,surfaceY).normalize()
  surfaceBasis.makeBasis(surfaceX,surfaceY,surfaceZ)
  surfaceQuaternion.setFromRotationMatrix(surfaceBasis)
  surfaceBase.setFromEuler(surfaceEuler.set(...rotation))
  surfaceBlend.slerpQuaternions(surfaceBase,surfaceQuaternion,weight)
  surfaceEuler.setFromQuaternion(surfaceBlend)
  return [surfaceEuler.x,surfaceEuler.y,surfaceEuler.z]
}
function aimGrip(position:Triple,rotation:Triple,p:CharacterPose,weight:number):Triple {
  // Counter torso wind-up so the weapon, not just the character root, meets the
  // selected tile's direction at contact. No target/occupancy queries in the rig.
  aimOrientation.setFromEuler(aimEuler.set(p.lean,p.twist,0)).invert()
  aimPoint.set(0,0.65,1).applyQuaternion(aimOrientation)
  aimPoint.x-=position[0];aimPoint.y-=position[1];aimPoint.z-=position[2];aimPoint.normalize()
  return [lerp(rotation[0],Math.atan2(aimPoint.z,aimPoint.y),weight),lerp(rotation[1],0,weight),lerp(rotation[2],-Math.asin(aimPoint.x),weight)]
}
// Desired hand sockets in torso coordinates. A shared two-hand grip is transformed
// from weapon space, rather than independently animating the supporting hand.
export function handPose(form:CharacterForm,p:CharacterPose,side:-1|1,variant:Attunement='light') : { position:Triple; rotation:Triple } {
  let position:Triple=[0.20,0.55,0.17], rotation:Triple=[0.18,0,0]
  if(form==='pawn') {
    const d=p.draw, cut=p.bladeTurn
    position=[lerp(katanaMount[0]-sheathAxis.x*0.35*d,0.22,cut),lerp(katanaMount[1]-sheathAxis.y*0.35*d,0.66,cut),lerp(katanaMount[2]-sheathAxis.z*0.35*d,0.34,cut)]
    rotation=[lerp(katanaRest[0],1.40,cut),lerp(0,0.9-Math.max(0,p.swing)*1.8,cut),lerp(katanaRest[2],-0.24,cut)]
    rotation=aimGrip(position,rotation,p,cut)
    if(side===-1) return {position:sheathPosition(d),rotation:[-0.15,0,-0.15]}
  } else if(form==='knight') {
    position=[0.12,0.65,0.18+p.thrust*0.20];rotation=aimGrip(position,[1.15+p.thrust*0.38,0,0.08],p,p.thrust)
    if(variant==='dark'){position=[0.14,0.67,0.12+p.thrust*0.16];rotation=aimGrip(position,[0.80+p.thrust*0.55,0,-0.08],p,p.thrust)}
  } else if(form==='bishop') {
    position=[0.23,0.64+p.cast*0.08,0.18];rotation=[0.10+p.cast*0.42,0.10,0.10]
    if(variant==='dark'){
      // Left palm cradles the book spine; right fingers hover over the open pages.
      position=[0.07,0.74+p.cast*0.055,0.24];rotation=[-0.45,0.12,-0.15]
      if(side===-1)return {position:[-0.10,0.66+p.cast*0.06,0.22],rotation:[0.72-p.cast*0.15,0.04,-0.12]}
    }else if(side===-1)return {position:[-0.20,0.57+p.cast*0.08,0.12],rotation:[-0.25,0.10,-0.1]}
  } else if(form==='rook'||form==='king') {
    position=[0.12-Math.max(0,p.swing)*0.05,0.61+Math.max(0,p.swing)*0.04+Math.max(0,-p.swing)*0.30,0.18+Math.max(0,p.swing)*0.14]
    rotation=[-0.25+p.swing*1.73,0.08-p.swing*0.30,-0.95+p.swing*0.97]
    if(form==='king') {position=[0.13-Math.max(0,p.swing)*0.05,0.68+Math.max(0,-p.swing)*0.32,0.17+Math.max(0,p.swing)*0.17];rotation=[0.15+p.swing*1.43,-0.10-p.swing*0.20,-0.75+p.swing*0.82]}
    if(variant==='dark'){
      if(form==='rook')position=[0.10-Math.max(0,p.swing)*0.12,0.61+Math.max(0,p.swing)*0.05+Math.max(0,-p.swing)*0.26,0.18+Math.max(0,p.swing)*0.14]
      else {position=[0.11-Math.max(0,p.swing)*0.07,0.65+Math.max(0,-p.swing)*0.29,0.17+Math.max(0,p.swing)*0.17];rotation=[0.12+p.swing*1.40,0.10-p.swing*0.40,-0.75+p.swing*0.84]}
    }
    rotation=surfaceGrip(p,rotation,Math.max(0,p.swing))
    if(p.guard) {position=[0.06,0.68,0.25];rotation=[0.18,0,-0.18]}
  } else {
    position=[side*0.24-side*p.swing*0.20,0.67+p.swing*0.04,0.18+Math.max(0,p.swing)*0.22]
    rotation=aimGrip(position,[1.25,side*(0.3-p.swing*0.8),side*-0.22],p,Math.max(0,p.swing))
    if(variant==='dark'){
      // Empty hands conduct the back-mounted mantle; no invisible knuckle punches.
      position=[side*(0.22+Math.max(0,p.swing)*0.06),0.62+p.cast*0.12,0.12+Math.max(0,p.swing)*0.08]
      rotation=[0.35,side*0.25,side*-0.18]
    }
    return {position,rotation}
  }
  if(side===-1) {
    // Left hand on the same shaft, below the right hand. Keep both sockets rigid.
    const [rx,ry,rz]=rotation,grip=form==='knight'&&variant==='dark'?-0.16:-0.115
    // XYZ Euler's Y column, without allocating vectors/quaternions per frame.
    const x=-Math.cos(ry)*Math.sin(rz),y=Math.cos(rx)*Math.cos(rz)-Math.sin(rx)*Math.sin(ry)*Math.sin(rz),z=Math.sin(rx)*Math.cos(rz)+Math.cos(rx)*Math.sin(ry)*Math.sin(rz)
    position=[position[0]+grip*x,position[1]+grip*y,position[2]+grip*z]
  }
  return {position,rotation}
}

// Reusable scratch storage; no geometry or Three objects allocated by the frame solver.
export function createArmSolver() {
  const axis=new Vector3(),bend=new Vector3(),elbow=new Vector3(),wrist=new Vector3(),lower=new Vector3(),down=new Vector3(0,-1,0)
  const upperRotation=new Quaternion(),lowerRotation=new Quaternion(),handRotation=new Quaternion(),desired=new Quaternion(),euler=new Euler()
  return (shoulder:Vector3,target:Triple,rotation:Triple,side:number)=>{
    axis.set(...target).sub(shoulder)
    const distance=Math.max(0.015,Math.min(armLengths.upper+armLengths.forearm-0.001,axis.length()))
    axis.normalize();wrist.copy(shoulder).addScaledVector(axis,distance)
    bend.set(side,0.05,-0.65).addScaledVector(axis,-bend.dot(axis)).normalize()
    const along=(armLengths.upper**2-armLengths.forearm**2+distance**2)/(2*distance)
    elbow.copy(shoulder).addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,armLengths.upper**2-along**2)))
    axis.copy(elbow).sub(shoulder).normalize();upperRotation.setFromUnitVectors(down,axis)
    lower.copy(wrist).sub(elbow).normalize();desired.setFromUnitVectors(down,lower)
    lowerRotation.copy(upperRotation).invert().multiply(desired)
    handRotation.copy(desired).invert().multiply(desired.setFromEuler(euler.set(...rotation)))
    return {elbow,wrist,upperRotation,lowerRotation,handRotation}
  }
}
