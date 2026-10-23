import { BoxGeometry, MeshLambertMaterial } from 'three'
import { checkerIndex, chessTileColors } from '../../data/terrainPalette'
import { biomes, type BiomeId } from '../../data/biomes'

// Shared immutable resources: 64 modules, without 64 copies of each geometry/material.
const cube = new BoxGeometry(1, 1, 1)
const teal = new MeshLambertMaterial({ color: '#3d6465', flatShading: true })
const grass = chessTileColors.map(
  (color) => new MeshLambertMaterial({ color, flatShading: true }),
)
const themes=Object.fromEntries(biomes.map(biome=>[biome.id,{side:new MeshLambertMaterial({color:biome.sides,flatShading:true}),
  top:biome.tiles.map(color=>new MeshLambertMaterial({color,flatShading:true}))}])) as Record<BiomeId,{side:MeshLambertMaterial;top:MeshLambertMaterial[]}>

export function TerrainTile({ column, row,biome }: { column: number; row: number;biome?:BiomeId }) {
  const theme=biome?themes[biome]:undefined
  return (
    <group name={`tile-${column}-${row}`} dispose={null}>
      <mesh geometry={cube} material={theme?.side??teal} position={[0, -0.405, 0]} scale={[0.985, 0.63, 0.985]} />
      <mesh geometry={cube} material={(theme?.top??grass)[checkerIndex(column, row)]} position={[0, -0.045, 0]} scale={[0.985, 0.09, 0.985]} />
    </group>
  )
}
