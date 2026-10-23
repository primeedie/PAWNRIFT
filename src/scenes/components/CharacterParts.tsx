import { BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Path, RingGeometry, Shape, SphereGeometry } from 'three'
import { characterPalettes } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { sculpted } from './characterMeshes'
import { InkedMesh } from './InkedMesh'

export type V = [number, number, number]
type Tone = keyof typeof characterPalettes.light
// Silhouette profiles are built once and shared by both attunements and every remount.
function profile(outline: [number, number][],holes:[number,number][][]=[]) {
  const shape = new Shape(); outline.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath()
  for(const points of holes){const hole=new Path();points.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();shape.holes.push(hole)}
  const mesh = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize:0.022,bevelThickness:0.025,bevelSegments:1, steps: 1 }); mesh.translate(0, 0, -0.5); return mesh
}
export const geometry = { ...sculpted, box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 12, 8),
  cylinder: new CylinderGeometry(1, 1, 1, 8), cone: new ConeGeometry(1, 1, 4), octahedron: new OctahedronGeometry(1), ring: new RingGeometry(0.12, 0.15, 12), arc: new RingGeometry(0.18, 0.20, 8, 1, 0, 1.8),
  blade: profile([[-0.16,-0.5],[0.16,-0.5],[0.5,-0.30],[0.32,0.25],[0,0.5],[-0.32,0.25],[-0.5,-0.30]]),
  greatblade: profile([[-0.18,-0.5],[0.18,-0.5],[0.18,-0.40],[0.48,-0.30],[0.37,0.30],[0,0.5],[-0.37,0.30],[-0.48,-0.30],[-0.18,-0.40]]),
  leaf: profile([[0,-0.5],[0.28,-0.25],[0.5,0.03],[0.32,0.28],[0,0.5],[-0.32,0.28],[-0.5,0.03],[-0.28,-0.25]]),
  voidBlade: profile([[-0.18,-0.5],[0.18,-0.5],[0.48,-0.30],[0.37,0.30],[0,0.5],[-0.28,0.22],[-0.15,0.13],[-0.36,0.02],[-0.20,-0.08],[-0.45,-0.21]],[ [[-0.09,-0.04],[0.07,-0.04],[0.07,0.19],[-0.09,0.19]] ]),
  tornCloth: profile([[-0.5,0.5],[0.5,0.5],[0.36,-0.45],[0.10,-0.22],[-0.05,-0.5],[-0.22,-0.29],[-0.5,-0.40]]),
  brokenRing: new RingGeometry(0.12,0.15,10,1,0,4.4),
  axe: profile([[-0.5,-0.35],[-0.30,0.40],[0.08,0.26],[0.48,0.5],[0.50,-0.3],[0.22,-0.5],[-0.03,-0.13]]),
  claw: profile([[-0.35,-0.5],[0.35,-0.5],[0.45,0.1],[0.12,0.5],[-0.12,0.18]]),
  mitre: profile([[-0.5,-0.5],[0.5,-0.5],[0.43,0.08],[0.12,0.5],[-0.02,0.16],[-0.14,0.5],[-0.43,0.08]]),
  plate: profile([[-0.5,0.5],[0.5,0.5],[0.42,-0.25],[0,-0.5],[-0.42,-0.25]]),
}
const finish={ivory:[0.43,0.12],armor:[0.52,0.55],cloth:[0.96,0],metal:[0.31,0.72],accent:[0.37,0.62],dark:[0.84,0.03],eye:[0.68,0],glow:[0.48,0.1]} as const
export const palettes = Object.fromEntries(Object.entries(characterPalettes).map(([name, colors]) => [name,
  Object.fromEntries(Object.entries(colors).map(([tone, color]) => [tone, new MeshStandardMaterial({color,
    roughness:finish[tone as Tone][0],metalness:finish[tone as Tone][1],flatShading:false,
    ...(tone==='glow'?{emissive:color,emissiveIntensity:0.12}:{})})]))])) as Record<Attunement, Record<Tone, MeshStandardMaterial>>
// Pawn has one uncorrupted charcoal/ivory material set, never either corrupted palette.
export const roninPalette={...palettes.light,
  armor:new MeshStandardMaterial({color:'#34343d',roughness:0.7,metalness:0.22}),
  cloth:new MeshStandardMaterial({color:'#24252e',roughness:0.98}),
  ivory:new MeshStandardMaterial({color:'#c5c0ad',roughness:0.93}),
  metal:new MeshStandardMaterial({color:'#9299a3',roughness:0.45,metalness:0.58}),
  accent:new MeshStandardMaterial({color:'#7b2c3b',roughness:0.85}),
  dark:new MeshStandardMaterial({color:'#181c25',roughness:0.87}),
}
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

export function Part({ shape = 'box', size, at = [0, 0, 0], rotate = [0, 0, 0], tone = 'ivory', variant,ronin=false,ink }: {
  shape?: keyof typeof geometry; size: readonly [number, number, number]; at?: V; rotate?: V; tone?: Tone; variant: Attunement;ronin?:boolean;ink?:boolean
}) { return <group scale={size as V} position={at} rotation={rotate}><InkedMesh geometry={geometry[shape]} material={(ronin?roninPalette:palettes[variant])[tone]}
  outline={ink??(Math.max(...size)>0.16&&Math.min(...size)>0.045&&tone!=='dark'&&tone!=='eye'&&shape!=='ring'&&shape!=='brokenRing')}/></group> }
