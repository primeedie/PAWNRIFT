import { BoxGeometry, Color, MeshLambertMaterial, MeshStandardMaterial } from 'three'
import { checkerIndex, chessTileColors } from '../../data/terrainPalette'
import { biomes, type BiomeId } from '../../data/biomes'
import type { Attunement } from '../../data/forms'
import { worldThemes } from '../../data/worldThemes'

// Shared immutable resources: 64 modules, without 64 copies of each geometry/material.
const cube = new BoxGeometry(1, 1, 1)
const teal = new MeshLambertMaterial({ color: '#3d6465', flatShading: true })
const grass = chessTileColors.map(
  (color) => new MeshLambertMaterial({ color, flatShading: true }),
)
const themes=Object.fromEntries(biomes.map(biome=>[biome.id,{side:new MeshLambertMaterial({color:biome.sides,flatShading:true}),
  top:biome.tiles.map(color=>new MeshLambertMaterial({color,flatShading:true}))}])) as Record<BiomeId,{side:MeshLambertMaterial;top:MeshLambertMaterial[]}>
const aligned=Object.fromEntries(biomes.flatMap(biome=>(['light','dark'] as const).map(alignment=>{
  const theme=worldThemes[alignment]
  return [`${biome.id}:${alignment}`,{side:new MeshStandardMaterial({color:new Color(biome.sides).lerp(new Color(theme.side),0.45),roughness:0.95,flatShading:true}),
    top:biome.tiles.map(color=>new MeshStandardMaterial({color:new Color(color).lerp(new Color(theme.tint),0.22),roughness:alignment==='light'?0.8:1,flatShading:true})),
    trim:new MeshStandardMaterial({color:theme.trim,emissive:theme.emission,emissiveIntensity:0.12,roughness:0.85})}]
}))) as Record<string,{side:MeshStandardMaterial;top:MeshStandardMaterial[];trim:MeshStandardMaterial}>

export function TerrainTile({ column, row,biome,alignment }: { column: number; row: number;biome?:BiomeId;alignment?:Attunement }) {
  const themed=biome&&alignment?aligned[`${biome}:${alignment}`]:undefined
  const theme=themed??(biome?themes[biome]:undefined)
  return (
    <group name={`tile-${column}-${row}`} dispose={null}>
      <mesh geometry={cube} material={theme?.side??teal} position={[0, -0.405, 0]} scale={[0.985, 0.63, 0.985]} />
      <mesh receiveShadow geometry={cube} material={(theme?.top??grass)[checkerIndex(column, row)]} position={[0, -0.045, 0]} scale={[0.985, 0.09, 0.985]} />
      {themed&&(row*3+column)%4===0&&(alignment==='light'?<group>
        {[-1,1].map(s=><mesh key={s} geometry={cube} material={themed.trim} position={[s*0.32,0.002,0]} scale={[0.018,0.003,0.30]}/>)}
        <mesh geometry={cube} material={themed.trim} position={[0,0.002,-0.15]} scale={[0.66,0.003,0.018]}/>
      </group>:<group rotation={[0,0.35,0]}>
        {[0,1,2].map(i=><mesh key={i} geometry={cube} material={themed.trim} position={[-0.22+i*0.17,0.002,(i%2)*0.11]} scale={[0.21,0.003,0.016]} rotation={[0,i%2?-0.8:0.5,0]}/>)}
      </group>)}
    </group>
  )
}
