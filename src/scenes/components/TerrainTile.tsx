import { BoxGeometry, MeshLambertMaterial } from 'three'
import { checkerIndex, chessTileColors } from '../../data/terrainPalette'

// Shared immutable resources: 64 modules, without 64 copies of each geometry/material.
const cube = new BoxGeometry(1, 1, 1)
const teal = new MeshLambertMaterial({ color: '#3d6465', flatShading: true })
const grass = chessTileColors.map(
  (color) => new MeshLambertMaterial({ color, flatShading: true }),
)

export function TerrainTile({ column, row }: { column: number; row: number }) {
  return (
    <group name={`tile-${column}-${row}`} dispose={null}>
      <mesh geometry={cube} material={teal} position={[0, -0.405, 0]} scale={[0.985, 0.63, 0.985]} />
      <mesh geometry={cube} material={grass[checkerIndex(column, row)]} position={[0, -0.045, 0]} scale={[0.985, 0.09, 0.985]} />
    </group>
  )
}
