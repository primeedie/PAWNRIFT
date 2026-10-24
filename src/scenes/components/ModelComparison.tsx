import { createContext, useContext, useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { MeshBasicMaterial, MeshStandardMaterial } from 'three'

export type ComparisonMode='final'|'silhouette'|'gray'
export const ModelComparisonContext=createContext<ComparisonMode>('final')
export const useModelComparison=()=>useContext(ModelComparisonContext)
const black=new MeshBasicMaterial({color:'#000000',toneMapped:false})
const gray=new MeshStandardMaterial({color:'#929292',roughness:0.9,metalness:0,flatShading:false})
// Viewer-only override, including weapons and cloth. Original shared materials remain immutable.
export function ComparisonMaterials({mode}:{mode:ComparisonMode}){
  const scene=useThree(state=>state.scene)
  useLayoutEffect(()=>{scene.overrideMaterial=mode==='silhouette'?black:mode==='gray'?gray:null;return ()=>{scene.overrideMaterial=null}},[mode,scene])
  return null
}
