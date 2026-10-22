import type { Ref } from 'react'
import type { MeshLambertMaterial } from 'three'

export function TrainingDummy({ materialRef }: { materialRef: Ref<MeshLambertMaterial> }) {
  return <group name="wooden-training-dummy">
    <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.29, 0.32, 0.12, 8]} /><meshLambertMaterial color="#53635d" flatShading /></mesh>
    <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.06, 0.08, 0.65, 6]} /><meshLambertMaterial color="#6e5547" flatShading /></mesh>
    <mesh position={[0, 0.65, 0]}><boxGeometry args={[0.43, 0.42, 0.25]} /><meshLambertMaterial ref={materialRef} color="#97745d" flatShading /></mesh>
    <mesh position={[0, 0.97, 0]} rotation={[0, 0.15, 0]}><boxGeometry args={[0.29, 0.25, 0.26]} /><meshLambertMaterial color="#b29772" flatShading /></mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * 0.25, 0.75, 0]} rotation={[0, 0, side * 0.25]}>
      <mesh><sphereGeometry args={[0.07, 6, 4]} /><meshLambertMaterial color="#4e5d61" flatShading /></mesh>
      <mesh position={[side * 0.1, -0.08, 0]} rotation={[0, 0, side * -0.6]}><boxGeometry args={[0.1, 0.24, 0.1]} /><meshLambertMaterial color="#8a6a53" flatShading /></mesh>
    </group>)}
    <mesh position={[0, 0.65, 0.132]}><ringGeometry args={[0.09, 0.14, 8]} /><meshBasicMaterial color="#9e4a50" /></mesh>
    <mesh position={[0, 0.65, 0.134]}><circleGeometry args={[0.045, 8]} /><meshBasicMaterial color="#d8c69d" /></mesh>
  </group>
}
