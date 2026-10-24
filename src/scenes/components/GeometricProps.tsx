import { BoxGeometry, ConeGeometry, DodecahedronGeometry, MeshLambertMaterial, MeshStandardMaterial, ExtrudeGeometry, Shape, Path } from 'three'
import type { PropKind } from '../../data/demoBoard'
import type { Attunement } from '../../data/forms'
import { worldThemes } from '../../data/worldThemes'
import { InkedMesh } from './InkedMesh'

const cube = new BoxGeometry(1, 1, 1)
const rock = new DodecahedronGeometry(1, 0)
const crystal = new ConeGeometry(1, 1, 4)
const materials = {
  trunk: new MeshLambertMaterial({ color: '#4c5b50', flatShading: true }),
  leaf: new MeshLambertMaterial({ color: '#85945c', flatShading: true }),
  leafLight: new MeshLambertMaterial({ color: '#9ca879', flatShading: true }),
  stone: new MeshLambertMaterial({ color: '#4d5e6b', flatShading: true }),
  moss: new MeshLambertMaterial({ color: '#72856a', flatShading: true }),
  gold: new MeshLambertMaterial({ color: '#bfa678', flatShading: true }),
}

export function Tree() {
  return (
    <group>
      <mesh geometry={cube} material={materials.trunk} position={[0, 0.48, 0]} scale={[0.09, 0.96, 0.09]} rotation={[0, 0, -0.12]} />
      <mesh geometry={cube} material={materials.leaf} position={[0.04, 1.12, 0]} scale={[0.47, 0.4, 0.4]} rotation={[0.05, 0.2, -0.16]} />
      <mesh geometry={cube} material={materials.leafLight} position={[-0.25, 0.82, 0.06]} scale={[0.35, 0.3, 0.33]} rotation={[0, 0.3, 0.3]} />
      <mesh geometry={cube} material={materials.leaf} position={[0.26, 0.78, -0.04]} scale={[0.34, 0.29, 0.32]} rotation={[0.2, 0, -0.3]} />
    </group>
  )
}

export function Rock() {
  return <group position={[0,0.17,0]} scale={[0.32,0.24,0.27]} rotation={[0.2,0.5,0.1]}><InkedMesh geometry={rock} material={materials.stone}/></group>
}

export function Wall() {
  return (
    <group>
      <group position={[0,0.48,0]} scale={[0.87,0.96,0.26]}><InkedMesh geometry={cube} material={materials.stone}/></group>
      <mesh geometry={cube} material={materials.moss} position={[0, 0.98, 0]} scale={[0.89, 0.06, 0.29]} />
    </group>
  )
}

export function Block() {
  return (
    <group>
      <group position={[0,0.22,0]} scale={[0.55,0.44,0.55]}><InkedMesh geometry={cube} material={materials.stone}/></group>
      <mesh geometry={cube} material={materials.moss} position={[0, 0.45, 0]} scale={[0.57, 0.05, 0.57]} />
    </group>
  )
}

export function Crystal() {
  return (
    <group>
      <mesh geometry={crystal} material={materials.gold} position={[0, 0.27, 0]} scale={[0.18, 0.54, 0.18]} />
      <mesh geometry={crystal} material={materials.gold} position={[0.21, 0.14, 0.05]} scale={[0.1, 0.28, 0.1]} />
    </group>
  )
}

const propComponents = { tree: Tree, rock: Rock, wall: Wall, block: Block, crystal: Crystal }
const themeMaterials=Object.fromEntries((['light','dark'] as const).map(alignment=>[alignment,{
  stone:new MeshStandardMaterial({color:worldThemes[alignment].stone,roughness:0.9,flatShading:true}),
  trim:new MeshStandardMaterial({color:worldThemes[alignment].trim,roughness:0.75,metalness:0.15,flatShading:true}),
}])) as Record<Attunement,{stone:MeshStandardMaterial;trim:MeshStandardMaterial}>
function wallProfile(dark:boolean){
  const s=new Shape();s.moveTo(-0.43,0);s.lineTo(0.43,0);s.lineTo(0.43,dark?0.74:0.98);s.lineTo(dark?0.10:0.43,1.02);s.lineTo(-0.43,dark?0.82:1.02);s.closePath()
  const hole=new Path();hole.moveTo(-0.10,0.18);hole.lineTo(-0.10,0.68);hole.lineTo(dark?0.16:0,0.88);hole.lineTo(0.10,0.66);hole.lineTo(0.10,0.18);hole.closePath();s.holes.push(hole)
  const g=new ExtrudeGeometry(s,{depth:0.26,bevelEnabled:false});g.translate(0,0,-0.13);return g
}
const alignedWalls={light:wallProfile(false),dark:wallProfile(true)}
function AlignedStructure({kind,alignment}:{kind:'wall'|'block';alignment:Attunement}){
  const dark=alignment==='dark',m=themeMaterials[alignment]
  if(kind==='block')return <group>
    <group position={[0,0.21,0]} scale={[0.54,0.42,0.54]}><InkedMesh geometry={cube} material={m.stone}/></group>
    <mesh geometry={cube} material={m.trim} position={[0,0.45,0]} scale={[0.57,0.05,0.57]}/>
    {dark?<mesh geometry={crystal} material={m.trim} position={[0.12,0.23,0.28]} scale={[0.10,0.24,0.025]} rotation={[0,0,0.7]}/>
      :[-1,1].map(s=><mesh key={s} geometry={cube} material={m.trim} position={[s*0.20,0.23,0.28]} scale={[0.025,0.29,0.02]}/>)}
  </group>
  return <group name={`${alignment}-pierced-wall`}>
    <InkedMesh geometry={alignedWalls[alignment]} material={m.stone}/>
    {(dark?[-1]:[-1,1]).map(s=><mesh key={s} geometry={cube} material={m.trim} position={[s*0.32,0.45,0.15]} scale={[0.045,0.74,0.025]} rotation={[0,0,dark?0.17:0]}/>)}
  </group>
}

export function GeometricProp({ kind,alignment }: { kind: PropKind;alignment?:Attunement }) {
  const Component = propComponents[kind]
  if(alignment&&(kind==='wall'||kind==='block'))return <group dispose={null}><AlignedStructure kind={kind} alignment={alignment}/></group>
  return <group dispose={null}><Component /></group>
}
