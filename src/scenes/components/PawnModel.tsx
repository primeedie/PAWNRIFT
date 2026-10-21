import { SheathedKatana } from './CrimsonKatana'

// A living chess piece: oversized round crown, collar, and flared pedestal body.
// Tiny limbs and a simple face add personality without a human swordsman silhouette.
export function PawnModel() {
  return (
    <group>
      {[-0.105, 0.105].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.13, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.18, 8]} />
            <meshLambertMaterial color="#ddd6bd" flatShading />
          </mesh>
          <mesh position={[x, 0.055, 0.045]}>
            <boxGeometry args={[0.13, 0.11, 0.19]} />
            <meshLambertMaterial color="#4c6265" flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.27, 0.29, 0.11, 12]} />
        <meshLambertMaterial color="#e9dfc3" flatShading />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.1, 0.25, 0.32, 12]} />
        <meshLambertMaterial color="#f1e8ce" flatShading />
      </mesh>
      <mesh position={[0, 0.64, 0]}>
        <cylinderGeometry args={[0.19, 0.2, 0.08, 12]} />
        <meshLambertMaterial color="#d5c9a9" flatShading />
      </mesh>
      <mesh position={[0, 0.73, 0]}>
        <cylinderGeometry args={[0.095, 0.1, 0.14, 10]} />
        <meshLambertMaterial color="#eee4c9" flatShading />
      </mesh>
      <mesh position={[0, 0.99, 0]}>
        <sphereGeometry args={[0.285, 14, 10]} />
        <meshLambertMaterial color="#fff0d0" flatShading />
      </mesh>
      <mesh position={[0, 1.02, -0.012]}>
        <sphereGeometry args={[0.296, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshLambertMaterial color="#e9dfc3" flatShading />
      </mesh>
      {[-0.082, 0.082].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.99, 0.267]}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshLambertMaterial color="#304a50" />
          </mesh>
          <mesh position={[x - 0.006, 1.001, 0.291]}>
            <sphereGeometry args={[0.008, 6, 4]} />
            <meshBasicMaterial color="#fff9e7" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.908, 0.277]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.042, 0.012, 0.01]} />
        <meshLambertMaterial color="#7c6554" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.235, 0.46, 0.015]} rotation={[0, 0, side * 0.24]}>
          <capsuleGeometry args={[0.055, 0.13, 2, 6]} />
          <meshLambertMaterial color="#e9dfc3" flatShading />
        </mesh>
      ))}
      <SheathedKatana />
    </group>
  )
}
