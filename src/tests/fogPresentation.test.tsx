import { it, expect } from 'vitest'
import { act, createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { FoggedTerrain } from '../scenes/components/FoggedTerrain'

extend({Group:THREE.Group,Mesh:THREE.Mesh,BoxGeometry:THREE.BoxGeometry})
it('fades real terrain without making faint transparent atmosphere opaque or leaving remembered emission bright',async()=>{
  const root=createRoot({} as HTMLCanvasElement)
  const renderer={render(){},setPixelRatio(){},setSize(){},xr:{},shadowMap:{enabled:false}}
  await root.configure({gl:renderer as unknown as THREE.WebGLRenderer,frameloop:'never',dpr:1,size:{width:320,height:240,top:0,left:0}})
  const haze=new THREE.MeshBasicMaterial({color:'#bbaabb',transparent:true,opacity:0.055,depthWrite:false})
  const stone=new THREE.MeshStandardMaterial({color:'#aaaaaa',emissive:'#655555',emissiveIntensity:0.12})
  let store:ReturnType<typeof root.render>
  const mount=async(visibility:'visible'|'remembered'|'hidden')=>{
    await act(async()=>{store=root.render(<FoggedTerrain visibility={visibility}><mesh name="haze" material={haze}><boxGeometry/></mesh><mesh name="stone" material={stone}><boxGeometry/></mesh></FoggedTerrain>)})
    const state=store!.getState()
    for(let i=0;i<80;i++)for(const subscriber of state.internal.subscribers)subscriber.ref.current(state,0.05,undefined)
    return state.scene
  }
  try{
    let scene=await mount('visible'),actual=(scene.getObjectByName('haze') as THREE.Mesh).material as THREE.MeshBasicMaterial
    expect(actual).not.toBe(haze);expect(actual.opacity).toBeCloseTo(0.055);expect(actual.transparent).toBe(true);expect(actual.depthWrite).toBe(false)
    scene=await mount('remembered');const remembered=(scene.getObjectByName('stone') as THREE.Mesh).material as THREE.MeshStandardMaterial
    expect(remembered.color.r).toBeLessThan(stone.color.r);expect(remembered.emissive.r).toBeLessThan(stone.emissive.r*0.4)
    scene=await mount('hidden');expect(scene.children[0].visible).toBe(false)
    scene=await mount('visible');expect(scene.children[0].visible).toBe(true)
    expect(haze.opacity).toBe(0.055);expect(haze.depthWrite).toBe(false);expect(stone.color.getHexString()).toBe('aaaaaa')
  }finally{root.unmount();haze.dispose();stone.dispose()}
})
