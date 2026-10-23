import { BoxGeometry, ConeGeometry, DodecahedronGeometry, MeshLambertMaterial } from 'three'
import type { PropKind } from '../../data/demoBoard'
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

export function GeometricProp({ kind }: { kind: PropKind }) {
  const Component = propComponents[kind]
  return <group dispose={null}><Component /></group>
}
