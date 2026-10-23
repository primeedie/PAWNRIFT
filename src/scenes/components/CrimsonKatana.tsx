import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { CharacterPose } from '../../utils/characterAnimation'
import { katanaMount, katanaRest, katanaScale, sheathPosition } from '../../utils/characterRig'
import { InkHull, InkedMesh } from './InkedMesh'
import { BoxGeometry, DoubleSide, ExtrudeGeometry, Group, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Quaternion, RingGeometry, Shape, Vector3 } from 'three'

const katanaBox = new BoxGeometry(1, 1, 1)
const katanaMaterials = {
  guard: new MeshStandardMaterial({ color: '#30313b', metalness: 0.35, roughness: 0.6, flatShading: true }),
  collar: new MeshStandardMaterial({ color: '#743042', metalness: 0.25, roughness: 0.65, flatShading: true }),
  grip: new MeshLambertMaterial({ color: '#22252c', flatShading: true }),
  wrap: new MeshLambertMaterial({ color: '#902a3c', flatShading: true }),
  pommel: new MeshStandardMaterial({ color: '#35323e', metalness: 0.3, roughness: 0.65, flatShading: true }),
  mouth: new MeshStandardMaterial({ color: '#45414b', metalness: 0.3, roughness: 0.65, flatShading: true }),
  crimsonFitting: new MeshLambertMaterial({ color: '#722c3d', flatShading: true }),
  tip: new MeshStandardMaterial({ color: '#47404b', metalness: 0.3, roughness: 0.65, flatShading: true }),
  mount: new MeshLambertMaterial({ color: '#34313a', flatShading: true }),
  spine: new MeshStandardMaterial({ color: '#211c25', roughness: 0.65, metalness: 0.25, flatShading: true }),
  blade: new MeshStandardMaterial({ color: '#8f1831', emissive: '#770d22', emissiveIntensity: 0.12, roughness: 0.6, metalness: 0.15, flatShading: true }),
  edge: new MeshStandardMaterial({ color: '#ee4253', emissive: '#bd2039', emissiveIntensity: 0.22, roughness: 0.5, metalness: 0.15, flatShading: true }),
  sheath: new MeshStandardMaterial({ color: '#24242d', roughness: 0.8, metalness: 0.1, flatShading: true }),
  trail: new MeshBasicMaterial({ color: '#c44b5b', transparent: true, opacity: 0.45, depthWrite: false, side: DoubleSide }),
}
const trailGeometry = new RingGeometry(0.45, 0.49, 12, 1, 0, 1.4)

// Original faceted sweep, split into contiguous spine/body/edge bands.
// Each station is [height, spine X, cutting-edge X]; the final point is the tip.
const stations = [
  [0.14, -0.038, 0.042],
  [0.35, -0.035, 0.048],
  [0.57, -0.025, 0.061],
  [0.77, -0.009, 0.078],
  [0.94, 0.016, 0.093],
  [1.05, 0.075, 0.075],
] as const

function bladeBand(start: number, end: number) {
  const points = stations.map(([y, spine, edge]) => [spine + (edge - spine) * start, y])
    .concat([...stations].reverse().map(([y, spine, edge]) => [spine + (edge - spine) * end, y]))
  const outline = new Shape()
  outline.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => outline.lineTo(x, y))
  outline.closePath()
  const geometry = new ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: false, steps: 1, curveSegments: 1 })
  geometry.translate(0, 0, -0.0175)
  return geometry
}

const spine = bladeBand(0, 0.28)
const blade = bladeBand(0.28, 0.84)
const edge = bladeBand(0.84, 1)
const silhouette=bladeBand(0,1)

export function CrimsonBlade() {
  return (
      <group name="crimson-blade" dispose={null}>
        <InkHull geometry={silhouette}/>
        <mesh geometry={spine} material={katanaMaterials.spine} />
        <mesh geometry={blade} material={katanaMaterials.blade} />
        <mesh geometry={edge} material={katanaMaterials.edge} />
      </group>
  )
}

export function KatanaHilt() {
  return (
    <group name="katana-hilt">
      <mesh position={[0, 0.115, 0]} rotation={[0, Math.PI / 8, 0]} geometry={katanaBox} scale={[0.17, 0.035, 0.12]} material={katanaMaterials.guard} />
      <mesh position={[0, 0.145, 0]} geometry={katanaBox} scale={[0.084, 0.035, 0.06]} material={katanaMaterials.collar} />
      <mesh position={[0, -0.005, 0]} geometry={katanaBox} scale={[0.063, 0.2, 0.065]} material={katanaMaterials.grip} />
      {[-0.065, -0.015, 0.035, 0.075].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, -0.35]} geometry={katanaBox} scale={[0.073, 0.017, 0.071]} material={katanaMaterials.wrap} />
      ))}
      <mesh position={[0, -0.115, 0]} geometry={katanaBox} scale={[0.078, 0.03, 0.078]} material={katanaMaterials.pommel} />
    </group>
  )
}

// Grip-local origin; attachment and future draw motion belong to the parent.
export function CrimsonKatana({ bladeVisible = true }: { bladeVisible?: boolean }) {
  return (
    <group name="crimson-katana">
      <group name="blade-visibility" visible={bladeVisible}><CrimsonBlade /></group>
      <KatanaHilt />
    </group>
  )
}

const sheathOutline = new Shape()
sheathOutline.moveTo(-0.063, 0.15)
stations.slice(1).forEach(([y, x]) => sheathOutline.lineTo(x - 0.025, y))
sheathOutline.lineTo(0.075, 1.10)
const sheathOuterEdge = [...stations].reverse()
sheathOuterEdge.forEach(([y, , x]) => sheathOutline.lineTo(x + 0.025, y))
sheathOutline.lineTo(0.067, 0.15)
sheathOutline.closePath()
const sheathGeometry = new ExtrudeGeometry(sheathOutline, { depth: 0.075, bevelEnabled: false, steps: 1, curveSegments: 1 })
sheathGeometry.translate(0, 0, -0.0375)

export function KatanaSheath() {
  return (
    <group name="katana-sheath">
      <InkedMesh geometry={sheathGeometry} material={katanaMaterials.sheath}/>
      <mesh position={[0.002, 0.17, 0]} geometry={katanaBox} scale={[0.144, 0.055, 0.086]} material={katanaMaterials.mouth} />
      <mesh position={[0.004, 0.22, 0]} geometry={katanaBox} scale={[0.137, 0.025, 0.08]} material={katanaMaterials.crimsonFitting} />
      <mesh position={[0.058, 1.025, 0]} rotation={[0, 0, -0.35]} geometry={katanaBox} scale={[0.083, 0.085, 0.084]} material={katanaMaterials.tip} />
      <mesh position={[0.052, 0.976, 0]} rotation={[0, 0, -0.2]} geometry={katanaBox} scale={[0.094, 0.024, 0.082]} material={katanaMaterials.crimsonFitting} />
    </group>
  )
}

export function SheathedKatana({ motion, hand }: { motion: RefObject<CharacterPose>; hand: RefObject<Group | null> }) {
  const drawn=useRef<Group>(null),stored=useRef<Group>(null),trail=useRef<Group>(null),scabbard=useRef<Group>(null),deflection=useRef<Group>(null)
  const socket=useRef({point:new Vector3(),hand:new Quaternion(),parent:new Quaternion()})
  useFrame(()=>{
    if(!drawn.current||!stored.current||!trail.current||!hand.current) return
    const p=motion.current,unsheathed=p.draw>0.002
    scabbard.current?.position.set(...sheathPosition(p.draw))
    stored.current.visible=!unsheathed;drawn.current.visible=unsheathed
    const parent=drawn.current.parent,target=socket.current
    if(parent){
      // Grip follows the wrist exactly. Only presentation; no action callbacks.
      hand.current.updateWorldMatrix(true,false);parent.updateWorldMatrix(true,false)
      target.point.set(0,0,0);hand.current.localToWorld(target.point);parent.worldToLocal(target.point)
      drawn.current.position.copy(target.point)
      hand.current.getWorldQuaternion(target.hand);parent.getWorldQuaternion(target.parent).invert()
      drawn.current.quaternion.copy(target.parent.multiply(target.hand))
    }
    trail.current.visible=unsheathed&&p.bladeTurn>0.1&&p.slash>0.3&&!p.guard
    if(deflection.current)deflection.current.visible=p.guard>0&&p.bladeTurn>0.70
    trail.current.position.copy(drawn.current.position);trail.current.quaternion.copy(drawn.current.quaternion)
  },-0.6)
  return <group name="left-hip-weapon-rig" dispose={null}>
    <mesh name="hip-mount" position={[-0.18,0.55,0.11]} geometry={katanaBox} scale={[0.19,0.04,0.05]} material={katanaMaterials.mount}/>
    <group ref={scabbard} name="left-hip-weapon-attachment" position={katanaMount} rotation={katanaRest} scale={katanaScale}>
      <KatanaSheath/>
      <group ref={stored} name="sheathed-sword"><CrimsonKatana bladeVisible={false}/></group>
    </group>
    <group ref={drawn} name="sword-draw-pivot" visible={false} scale={katanaScale}><CrimsonKatana/><group ref={deflection} visible={false} name="katana-deflection-flash"><mesh position={[0,0.67,0]} geometry={katanaBox} material={katanaMaterials.trail} scale={[0.12,0.05,0.12]}/></group></group>
    <group ref={trail} visible={false} scale={katanaScale}><mesh position={[0,0.40,0]} geometry={trailGeometry} material={katanaMaterials.trail}/></group>
  </group>
}
