import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, Mesh, MeshLambertMaterial, MeshBasicMaterial, MeshStandardMaterial, type Material } from 'three'
import type { Visibility } from '../../game/logic/visibility'

type FogMaterial = MeshLambertMaterial | MeshBasicMaterial | MeshStandardMaterial
type FadingMaterial = { material: FogMaterial; base: Color }
const mist = new Color('#354153')

// Static terrain only: no opaque fog plane over the Pawn. Dynamic content must use current sight.
export function FoggedTerrain({ visibility, children }: { visibility: Visibility; children: ReactNode }) {
  const root = useRef<Group>(null)
  const materials = useRef<FadingMaterial[]>([])
  const amount = useRef(visibility === 'hidden' ? 0 : visibility === 'remembered' ? 0.38 : 1)

  useLayoutEffect(() => {
    const restored: { mesh: Mesh; original: Mesh['material'] }[] = []
    root.current!.visible = amount.current > 0.002
    root.current!.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const original = object.material
      const copy = (source: Material) => {
        if(!(source instanceof MeshLambertMaterial||source instanceof MeshBasicMaterial||source instanceof MeshStandardMaterial))return source
        const material = source.clone()
        materials.current.push({ material, base: source.color.clone() })
        return material
      }
      object.material = Array.isArray(original)
        ? original.map((material) => copy(material as FogMaterial)) : copy(original as FogMaterial)
      restored.push({ mesh: object, original })
    })
    return () => {
      materials.current.forEach(({ material }) => material.dispose())
      materials.current = []
      restored.forEach(({ mesh, original }) => { mesh.material = original })
    }
  }, [])

  useFrame((_, delta) => {
    const target = visibility === 'visible' ? 1 : visibility === 'remembered' ? 0.38 : 0
    amount.current += (target - amount.current) * (1 - Math.exp(-10 * delta))
    const value = amount.current
    root.current!.userData.fogAmount=value
    root.current!.visible = value > 0.002
    for (const { material, base } of materials.current) {
      const transparent = value < 0.379
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
      material.opacity = Math.min(1, value / 0.38)
      material.depthWrite = !transparent
      material.color.copy(base).multiplyScalar(0.4 + 0.6 * value).lerp(mist, (1 - value) * 0.2)
    }
  })

  return <group ref={root} dispose={null}>{children}</group>
}
