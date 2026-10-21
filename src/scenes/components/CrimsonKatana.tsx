import { ExtrudeGeometry, Shape } from 'three'

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

export function CrimsonBlade() {
  return (
      <group name="crimson-blade" dispose={null}>
        <mesh geometry={spine}>
          <meshStandardMaterial color="#211c25" roughness={0.65} metalness={0.25} flatShading />
        </mesh>
        <mesh geometry={blade}>
          <meshStandardMaterial color="#8f1831" emissive="#770d22" emissiveIntensity={0.12} roughness={0.6} metalness={0.15} flatShading />
        </mesh>
        <mesh geometry={edge}>
          <meshStandardMaterial color="#ee4253" emissive="#bd2039" emissiveIntensity={0.22} roughness={0.5} metalness={0.15} flatShading />
        </mesh>
      </group>
  )
}

export function KatanaHilt() {
  return (
    <group name="katana-hilt">
      <mesh position={[0, 0.115, 0]} rotation={[0, Math.PI / 8, 0]}>
        <boxGeometry args={[0.17, 0.035, 0.12]} />
        <meshStandardMaterial color="#30313b" metalness={0.35} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.145, 0]}>
        <boxGeometry args={[0.084, 0.035, 0.06]} />
        <meshStandardMaterial color="#743042" metalness={0.25} roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.005, 0]}>
        <boxGeometry args={[0.063, 0.2, 0.065]} />
        <meshLambertMaterial color="#22252c" />
      </mesh>
      {[-0.065, -0.015, 0.035, 0.075].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.073, 0.017, 0.071]} />
          <meshLambertMaterial color="#902a3c" />
        </mesh>
      ))}
      <mesh position={[0, -0.115, 0]}>
        <boxGeometry args={[0.078, 0.03, 0.078]} />
        <meshStandardMaterial color="#35323e" metalness={0.3} roughness={0.65} />
      </mesh>
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
      <mesh geometry={sheathGeometry} dispose={null}>
        <meshStandardMaterial color="#24242d" roughness={0.8} metalness={0.1} flatShading />
      </mesh>
      <mesh position={[0.002, 0.17, 0]}>
        <boxGeometry args={[0.144, 0.055, 0.086]} />
        <meshStandardMaterial color="#45414b" roughness={0.65} metalness={0.3} />
      </mesh>
      <mesh position={[0.004, 0.22, 0]}>
        <boxGeometry args={[0.137, 0.025, 0.08]} />
        <meshLambertMaterial color="#722c3d" />
      </mesh>
      <mesh position={[0.058, 1.025, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.083, 0.085, 0.084]} />
        <meshStandardMaterial color="#47404b" roughness={0.65} metalness={0.3} />
      </mesh>
      <mesh position={[0.052, 0.976, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.094, 0.024, 0.082]} />
        <meshLambertMaterial color="#722c3d" />
      </mesh>
    </group>
  )
}

export function SheathedKatana() {
  return (
    // Pawn faces +Z: left is -X, scabbard extends backward along -Z.
    // Separate attachment / sheath / sword pivots prepare future draw motions only.
    <group name="left-hip-weapon-rig">
      <mesh name="hip-mount" position={[-0.265, 0.43, 0.11]}>
        <boxGeometry args={[0.23, 0.04, 0.05]} />
        <meshLambertMaterial color="#34313a" />
      </mesh>
      <group name="left-hip-weapon-attachment" position={[-0.4, 0.45, 0.1]} rotation={[-1.82, 0, 0]} scale={0.64}>
        <KatanaSheath />
        <group name="sword-draw-pivot"><CrimsonKatana bladeVisible={false} /></group>
      </group>
    </group>
  )
}
