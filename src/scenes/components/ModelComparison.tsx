import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Material } from 'three'

export type ComparisonMode='final'|'silhouette'|'gray'|'grayscale'
export const ModelComparisonContext=createContext<ComparisonMode>('final')
export const useModelComparison=()=>useContext(ModelComparisonContext)
const black=new MeshBasicMaterial({color:'#000000',toneMapped:false})
const gray=new MeshStandardMaterial({color:'#929292',roughness:0.9,metalness:0,flatShading:false})
export function grayscaleMaterial(source:Material){
  const copy=source.clone()
  for(const key of ['color','emissive'] as const){
    const color=(copy as unknown as Record<string,unknown>)[key]
    if(color instanceof Color){const value=color.r*0.2126+color.g*0.7152+color.b*0.0722;color.setRGB(value,value,value)}
  }
  return copy
}
// Viewer-only override, including weapons and cloth. Original shared materials remain immutable.
export function ComparisonMaterials({mode,revision=''}:{mode:ComparisonMode;revision?:string}){
  const scene=useThree(state=>state.scene)
  const cache=useRef(new Map<Material,Material>()),meshes=useRef(new Map<Mesh,{original:Mesh['material'];converted:Mesh['material']}>())
  useLayoutEffect(()=>{
    scene.overrideMaterial=mode==='silhouette'?black:mode==='gray'?gray:null
    return ()=>{
      scene.overrideMaterial=null
      meshes.current.forEach(({original,converted},mesh)=>{if(mesh.material===converted)mesh.material=original});meshes.current.clear()
      cache.current.forEach(material=>material.dispose());cache.current.clear()
    }
  },[mode,scene,revision])
  useFrame(()=>{
    if(mode!=='grayscale')return
    const convert=(source:Material)=>{let copy=cache.current.get(source);if(!copy){copy=grayscaleMaterial(source);cache.current.set(source,copy)}return copy}
    scene.traverseVisible(object=>{
      if(!(object instanceof Mesh)||object.material===meshes.current.get(object)?.converted)return
      const original=object.material,converted=Array.isArray(original)?original.map(convert):convert(original)
      meshes.current.set(object,{original,converted});object.material=converted
    })
  },-0.05)
  return null
}
