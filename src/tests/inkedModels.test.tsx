import { describe,expect,it } from 'vitest'
import { Euler,Matrix4,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from 'three'
import { Children,isValidElement,type ReactNode } from 'react'
import { sculpted } from '../scenes/components/characterMeshes'
import { characterDesigns,characterTiming,roninFollowupMs } from '../data/characterDesigns'
import { palettes,roninPalette } from '../scenes/components/CharacterParts'
import { characterPose,contactTime,presentationDuration } from '../utils/characterAnimation'
import { voidMantlePose } from '../utils/voidMantle'
import { impactPresentationDelay,targetReaction } from '../utils/combatPresentation'
import { handEquipment,equipmentByForm } from '../data/attunementAppearance'
import { Weapon } from '../scenes/components/CharacterEquipment'
import { useArtSettings } from '../ui/artSettingsStore'
import { usePawnStore } from '../game/state/pawnStore'
import { createTraining,trainingControl } from '../game/logic/training'
import { resolvePlayerAction } from '../game/logic/combat'

const forms=Object.keys(characterDesigns) as (keyof typeof characterDesigns)[]
function names(node:ReactNode):string[]{return Children.toArray(node).flatMap(child=>isValidElement<{name?:string;children?:ReactNode}>(child)?[child.props.name??'',...names(child.props.children)]:[])}
function transform(position:number[],rotation:number[]){return new Matrix4().makeRotationFromEuler(new Euler(...rotation as [number,number,number])).setPosition(...position as [number,number,number])}
describe('shaped diorama meshes and equipment',()=>{
  it('keeps shared finite indexed surfaces within a small reusable geometry budget',()=>{
    let triangles=0
    for(const geometry of Object.values(sculpted)){
      geometry.computeBoundingBox();const size=geometry.boundingBox!.getSize(new Vector3())
      expect(size.x).toBeGreaterThan(0);expect(size.y).toBeGreaterThan(0);expect(size.z).toBeGreaterThan(0.01)
      expect([...geometry.attributes.position.array,...geometry.attributes.normal.array].every(Number.isFinite)).toBe(true)
      expect(geometry.index?.count??geometry.attributes.position.count).toBeLessThan(5000)
      triangles+=(geometry.index?.count??geometry.attributes.position.count)/3
    }
    expect(triangles).toBeLessThan(6500)
    // Outward normals: the torso's front is a lit surface, not an inside-out shell.
    const positions=sculpted.cuirass.attributes.position,normals=sculpted.cuirass.attributes.normal
    expect(normals.getZ(12*2)).toBeGreaterThan(0)
    expect(positions.getZ(12*2)).toBeGreaterThan(0)
  })
  it('cuts actual negative space through Void armor and retains volumetric cloth folds',()=>{
    const mesh=new Mesh(sculpted.fracturedPlate,new MeshBasicMaterial());mesh.updateMatrixWorld()
    expect(new Raycaster(new Vector3(0,0.07,2),new Vector3(0,0,-1)).intersectObject(mesh)).toHaveLength(0)
    expect(new Raycaster(new Vector3(0.30,0,2),new Vector3(0,0,-1)).intersectObject(mesh).length).toBeGreaterThan(0)
    sculpted.raggedCloth.computeBoundingBox();expect(sculpted.raggedCloth.boundingBox!.getSize(new Vector3()).z).toBeGreaterThan(0.1)
  })
  it('keeps Pawn charcoal/ivory and separates rough cloth, steel and porcelain responses',()=>{
    for(const material of [roninPalette.cloth,roninPalette.armor,roninPalette.dark])expect(material.color.g).toBeLessThanOrEqual(Math.max(material.color.r,material.color.b))
    expect(roninPalette.ivory.color.r).toBeGreaterThan(roninPalette.cloth.color.r*5)
    expect(palettes.light.cloth.roughness).toBeGreaterThan(palettes.light.metal.roughness)
    expect(palettes.light.metal.metalness).toBeGreaterThan(palettes.light.ivory.metalness)
  })
  it('uses exclusive Bishop sockets, different Knight meshes, dual Light claws and back-only Void wings',()=>{
    expect(names(Weapon({form:'knight',variant:'light'}))).toContain('light-cavalry-lance')
    expect(names(Weapon({form:'knight',variant:'dark'}))).toContain('dark-combat-spear')
    expect(handEquipment('bishop','light',-1)).toBeUndefined();expect(handEquipment('bishop','dark',1)).toBeUndefined()
    expect(handEquipment('bishop','light',1)).toBe('staff');expect(handEquipment('bishop','dark',-1)).toBe('tome')
    expect(handEquipment('queen','light',-1)).toBe('claws');expect(handEquipment('queen','light',1)).toBe('claws')
    expect(equipmentByForm.queen.dark).toBe('void-mantle')
    expect(Weapon({form:'queen',variant:'dark',side:-1})).toBeNull();expect(Weapon({form:'queen',variant:'dark',side:1})).toBeNull()
  })
})
describe('articulated Void mantle',()=>{
  it('folds compactly, unfolds on actual attacks and keeps both linkage segments attached',()=>{
    const rest=characterPose('queen','idle',0,false,'dark'),hit=characterPose('queen','attack',characterTiming.queen.impact/characterTiming.queen.basic,false,'dark')
    expect(voidMantlePose(rest,1).advance).toBe(0);expect(voidMantlePose(hit,1).advance).toBeGreaterThan(0.3)
    for(const cue of ['idle','move','attack','signature'] as const)for(let i=0;i<=100;i++)for(const side of [-1,1] as const){
      const p=characterPose('queen',cue,i/100,false,'dark');p.reach=Math.SQRT2
      const rig=voidMantlePose(p,side),joint=new Vector3(...rig.joint),end=new Vector3(side*rig.spread,0,rig.advance)
      expect(joint.length()).toBeCloseTo(0.48,6);expect(joint.distanceTo(end)).toBeCloseTo(0.48,6)
    }
    expect(voidMantlePose(characterPose('queen','attack',1,false,'dark'),1)).toEqual(voidMantlePose(rest,1))
  })
  it('brings the leading blade edge into the neighboring target envelope in all eight directions',()=>{
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const p=characterPose('queen','attack',characterTiming.queen.impact/characterTiming.queen.basic,false,'dark');p.reach=Math.hypot(dx,dz)
      const rig=voidMantlePose(p,1),matrix=transform([0,0,0],[p.lean,p.twist,0])
        .multiply(transform([0.17,0.80,-0.12],rig.shoulder)).multiply(transform([rig.spread,0,rig.advance],[0,0,0]))
        .multiply(transform([0,0,0],rig.hinge)).multiply(transform([0,-0.015,-0.035],[0,0.12,Math.PI]))
      const edge=new Vector3(0,0.64,0).applyMatrix4(matrix)
      expect(Math.abs(edge.x)).toBeLessThan(0.30);expect(edge.y).toBeGreaterThan(0.25);expect(edge.y).toBeLessThan(1.1)
      expect(edge.z).toBeGreaterThan(p.reach-0.30)
      edge.applyAxisAngle(new Vector3(0,1,0),Math.atan2(dx,dz))
      expect(Math.hypot(edge.x-dx,edge.z-dz)).toBeLessThan(0.40)
    }
  })
})
describe('cinematic presentation remains independent of gameplay',()=>{
  it('uses longer per-piece clips, short heavy contact dwell and a seated Sharpener follow-up',()=>{
    for(const form of forms){expect(characterTiming[form].basic).toBeGreaterThanOrEqual(700);expect(characterTiming[form].basic).toBeLessThanOrEqual(1800)}
    expect(contactTime(0.51,0.5,1500)).toBe(0.5);expect(contactTime(1,0.5,1500)).toBeCloseTo(1)
    const game=createTraining(1).game,a=resolvePlayerAction(game,{kind:'attack',targetId:'dummy-1'})!,b=resolvePlayerAction({...a,passives:{...a.passives,sharpener:1}},{kind:'attack',targetId:'dummy-1'})!
    const delayed=b.events.find(event=>event.effect==='sharpener')!
    expect(delayed.delayMs).toBe(430) // Existing resolved metadata is preserved.
    expect(impactPresentationDelay(delayed,b.events)).toBe(roninFollowupMs)
    expect(characterPose('pawn','attack',roninFollowupMs/characterTiming.pawn.basic).draw).toBe(0)
    expect(presentationDuration({...b,lastAction:'attack'})).toBeGreaterThan(roninFollowupMs)
  })
  it('never lets sampling, outlines, lighting or viewer controls mutate a run/save or consume RNG',()=>{
    const before=usePawnStore.getState(),snapshot=structuredClone({deck:before.deck,progress:before.progress,turn:before.turn,transformations:before.transformations,enemies:before.enemies})
    const settings=useArtSettings.getState()
    try{
      useArtSettings.setState({outlines:false,lighting:'neutral',viewerOpen:true})
      for(const form of forms)for(const variant of ['light','dark'] as const)for(let i=0;i<100;i++)characterPose(form,'signature',i/99,false,variant)
      const after=usePawnStore.getState();expect({deck:after.deck,progress:after.progress,turn:after.turn,transformations:after.transformations,enemies:after.enemies}).toEqual(snapshot)
    }finally{useArtSettings.setState(settings)}
  })
  it('keeps Dark Queen single-target basics and existing Bleed without wing damage, flight or range changes',()=>{
    const base=createTraining(2),queen=trainingControl(base.game,base.session,{kind:'form',form:'queen',attunement:'dark'})!.game
    const before=structuredClone(queen),next=resolvePlayerAction(queen,{kind:'attack',targetId:'dummy-1'})!
    expect(next.events.filter(event=>event.kind==='hit')).toHaveLength(1);expect(next.enemies[0].bleed).toHaveLength(1)
    expect(queen).toEqual(before);expect(targetReaction(100,440)).toBe(0);expect(targetReaction(500,440)).toBeGreaterThan(0)
    expect(targetReaction(800,440)).toBe(0)
  })
})
