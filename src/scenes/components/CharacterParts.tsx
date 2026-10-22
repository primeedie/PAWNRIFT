import { BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, MeshBasicMaterial, MeshLambertMaterial, OctahedronGeometry, RingGeometry, Shape, SphereGeometry } from 'three'
import { characterPalettes } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'

export type V = [number, number, number]
type Tone = keyof typeof characterPalettes.light
// Silhouette profiles are built once and shared by both attunements and every remount.
function profile(outline: [number, number][]) {
  const shape = new Shape(); outline.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath()
  const mesh = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 }); mesh.translate(0, 0, -0.5); return mesh
}
export const geometry = { box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 10, 6),
  cylinder: new CylinderGeometry(1, 1, 1, 8), cone: new ConeGeometry(1, 1, 4), octahedron: new OctahedronGeometry(1), ring: new RingGeometry(0.12, 0.15, 12), arc: new RingGeometry(0.18, 0.20, 8, 1, 0, 1.8),
  blade: profile([[-0.16,-0.5],[0.16,-0.5],[0.5,-0.30],[0.32,0.25],[0,0.5],[-0.32,0.25],[-0.5,-0.30]]),
  greatblade: profile([[-0.18,-0.5],[0.18,-0.5],[0.18,-0.40],[0.48,-0.30],[0.37,0.30],[0,0.5],[-0.37,0.30],[-0.48,-0.30],[-0.18,-0.40]]),
  leaf: profile([[0,-0.5],[0.28,-0.25],[0.5,0.03],[0.32,0.28],[0,0.5],[-0.32,0.28],[-0.5,0.03],[-0.28,-0.25]]),
  axe: profile([[-0.5,-0.35],[-0.30,0.40],[0.08,0.26],[0.48,0.5],[0.50,-0.3],[0.22,-0.5],[-0.03,-0.13]]),
  claw: profile([[-0.35,-0.5],[0.35,-0.5],[0.45,0.1],[0.12,0.5],[-0.12,0.18]]),
  mitre: profile([[-0.5,-0.5],[0.5,-0.5],[0.43,0.08],[0.12,0.5],[-0.02,0.16],[-0.14,0.5],[-0.43,0.08]]),
  plate: profile([[-0.5,0.5],[0.5,0.5],[0.42,-0.25],[0,-0.5],[-0.42,-0.25]]),
}
export const palettes = Object.fromEntries(Object.entries(characterPalettes).map(([name, colors]) => [name,
  Object.fromEntries(Object.entries(colors).map(([tone, color]) => [tone, new MeshLambertMaterial({ color, flatShading: true })]))])) as Record<Attunement, Record<Tone, MeshLambertMaterial>>
export const effects = { light: new MeshBasicMaterial({ color: characterPalettes.light.glow, transparent: true, opacity: 0.40, depthWrite: false, side: DoubleSide }),
  dark: new MeshBasicMaterial({ color: characterPalettes.dark.glow, transparent: true, opacity: 0.40, depthWrite: false, side: DoubleSide }),
  samurai: new MeshBasicMaterial({color:'#c44b5b',transparent:true,opacity:0.75,depthWrite:false,side:DoubleSide}) }
const mantle = new Shape()
mantle.moveTo(-0.14, 0); [[0.13, 0.02], [0.19, -0.26], [0.11, -0.24], [0.07, -0.33], [0.01, -0.26], [-0.04, -0.30], [-0.15, -0.22]].forEach(([x, y]) => mantle.lineTo(x, y))
mantle.closePath()
export const mantleGeometry = new ExtrudeGeometry(mantle, { depth: 0.018, bevelEnabled: false, steps: 1 })
const mantleVertices = mantleGeometry.attributes.position
for (let i = 0; i < mantleVertices.count; i++) mantleVertices.setZ(i, mantleVertices.getZ(i) + Math.abs(mantleVertices.getX(i)) * 0.30 + Math.sin(mantleVertices.getX(i) * 26) * 0.018)
mantleGeometry.computeVertexNormals()

export function Part({ shape = 'box', size, at = [0, 0, 0], rotate = [0, 0, 0], tone = 'ivory', variant }: {
  shape?: keyof typeof geometry; size: readonly [number, number, number]; at?: V; rotate?: V; tone?: Tone; variant: Attunement
}) { return <mesh geometry={geometry[shape]} material={palettes[variant][tone]} scale={size as V} position={at} rotation={rotate} /> }
