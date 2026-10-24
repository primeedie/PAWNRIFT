import { it, expect, describe } from 'vitest'
import { act, createRoot, extend } from '@react-three/fiber'
import { Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, BoxGeometry, Raycaster, Vector3, type WebGLRenderer } from 'three'
import { ComparisonMaterials, grayscaleMaterial } from '../scenes/components/ModelComparison'
import { geometry, roninPalette } from '../scenes/components/CharacterParts'
import { characterPose } from '../utils/characterAnimation'
import { characterTiming } from '../data/characterDesigns'

describe('Ivory Ronin value separation and real consumed geometry',()=>{
  it('keeps the neutral Pawn ivory dominant at its crown/armor and separates graphite underlayers without emission',()=>{
    const luminance=(color:Color)=>color.r*.2126+color.g*.7152+color.b*.0722
    expect(luminance(roninPalette.armor.color)).toBeGreaterThan(luminance(roninPalette.cloth.color)*5)
    expect(luminance(roninPalette.ivory.color)).toBeGreaterThan(luminance(roninPalette.armor.color))
    expect(roninPalette.armor.emissive.getHex()).toBe(0)
    geometry.pawnCrown.computeBoundingBox();const size=geometry.pawnCrown.boundingBox!.getSize(new Vector3())
    expect(size.x/size.y).toBeGreaterThan(.9);expect(size.z/size.y).toBeGreaterThan(.9)
    for(const cue of ['idle','move','attack','parry'] as const)expect(characterPose('pawn',cue,.3,false,'light')).toEqual(characterPose('pawn',cue,.3,false,'dark'))
  })
  it.each([
    ['voidEquine',[-.10,.10],[.40,-.30]],
    ['rupturedTorso',[0,0],[-.36,.25]],
    ['brokenTower',[-.16,-.12],[-.44,.35]],
    ['voidRoyalMask',[-.07,.07],[-.39,.18]],
  ] as const)('%s has an actual open cavity surrounded by solid structure', (shape,opening,solid)=>{
    const mesh=new Mesh(geometry[shape],new MeshBasicMaterial());mesh.updateMatrixWorld()
    const hit=(at:readonly number[])=>new Raycaster(new Vector3(at[0],at[1],2),new Vector3(0,0,-1)).intersectObject(mesh)
    expect(hit(opening)).toHaveLength(0);expect(hit(solid).length).toBeGreaterThan(0)
  })
  it('differentiates preparation and recovery while preserving lance/staff contact peaks and reduced-motion boundaries',()=>{
    for(const form of ['knight','bishop','rook','queen','king'] as const){
      expect(characterPose(form,'attack',.16,false,'dark')).not.toEqual(characterPose(form,'attack',.16,false,'light'))
      for(const variant of ['light','dark'] as const){
        const hit=characterPose(form,'attack',characterTiming[form].impact/characterTiming[form].basic,false,variant)
        if(form==='knight')expect(hit.thrust).toBeCloseTo(1)
        if(form==='bishop')expect(hit.cast).toBeCloseTo(1)
        const reduced=characterPose(form,'move',.16,true,variant)
        expect([reduced.lean,reduced.twist,reduced.leftLeg,reduced.rightLeg,reduced.cape]).toEqual([0,0,0,0,0])
      }
    }
  })
})

describe('viewer-only grayscale ownership',()=>{
  it('preserves material values, physical properties and source ownership when removing hue',()=>{
    const source=new MeshStandardMaterial({color:'#b35a31',emissive:'#422353',roughness:.83,metalness:.15,transparent:true,opacity:.6}),before=source.color.clone()
    const copy=grayscaleMaterial(source) as MeshStandardMaterial
    expect(copy.color.r).toBeCloseTo(before.r*.2126+before.g*.7152+before.b*.0722)
    expect(copy.color.r).toBe(copy.color.g);expect(copy.color.g).toBe(copy.color.b)
    expect(copy.emissive.r).toBe(copy.emissive.g);expect(copy.roughness).toBe(source.roughness)
    expect(copy.opacity).toBe(.6);expect(source.color).toEqual(before)
    copy.dispose();source.dispose()
  })
  it('reuses owned comparison materials and restores shared originals on mode/model changes',async()=>{
    extend({Group,Mesh,BoxGeometry})
    const root=createRoot({} as HTMLCanvasElement),source=new MeshStandardMaterial({color:'#b13e64'})
    const renderer={render(){},setPixelRatio(){},setSize(){},xr:{},shadowMap:{enabled:false}}
    await root.configure({gl:renderer as unknown as WebGLRenderer,frameloop:'never',dpr:1,size:{width:320,height:240,top:0,left:0}})
    let store:ReturnType<typeof root.render>
    const mount=async(mode:'grayscale'|'silhouette'|'final',revision:string)=>{
      await act(async()=>{store=root.render(<><ComparisonMaterials mode={mode} revision={revision}/><mesh name={revision} material={source}><boxGeometry/></mesh></>)})
      const state=store!.getState();for(const subscriber of state.internal.subscribers)subscriber.ref.current(state,.016,undefined)
      return state
    }
    try{
      let state=await mount('grayscale','one'),mesh=state.scene.getObjectByName('one') as Mesh
      const copy=mesh.material as MeshStandardMaterial;expect(copy).not.toBe(source);expect(copy.color.r).toBe(copy.color.b)
      for(const subscriber of state.internal.subscribers)subscriber.ref.current(state,.016,undefined)
      expect(mesh.material).toBe(copy)
      state=await mount('grayscale','two');mesh=state.scene.getObjectByName('two') as Mesh;expect(mesh.material).not.toBe(copy)
      state=await mount('silhouette','two');expect(state.scene.overrideMaterial?.type).toBe('MeshBasicMaterial');expect(mesh.material).toBe(source)
      state=await mount('final','two');expect(state.scene.overrideMaterial).toBeNull();expect(mesh.material).toBe(source);expect(source.color.getHexString()).toBe('b13e64')
    }finally{root.unmount();source.dispose()}
  })
})
