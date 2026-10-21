import { BoxGeometry, RingGeometry } from 'three'

const slab = new BoxGeometry(0.56, 0.044, 0.56)
const border = new RingGeometry(0.23, 0.29, 4)

export function ExitMarker() {
  return (
    <group name="exit-marker">
      <mesh geometry={slab} position={[0, 0.022, 0]}>
        <meshLambertMaterial color="#526c70" />
      </mesh>
      <mesh geometry={border} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.048, 0]}>
        <meshBasicMaterial color="#c2b98e" />
      </mesh>
    </group>
  )
}
