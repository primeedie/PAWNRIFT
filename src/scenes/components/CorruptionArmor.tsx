import { characterDesigns, type CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

export function CorruptionArmor({form,variant}:{form:CharacterForm;variant:Attunement}){
  if(form==='pawn')return null
  const design=characterDesigns[form],heavy=form==='rook'||form==='king',scholar=form==='bishop',dark=variant==='dark'
  const shape=form==='rook'?'fortressTorso':form==='queen'?'sovereignTorso':form==='king'?'royalTorso':form==='knight'?'lancerTorso':'robe'
  return <group name={dark?`void-${form}-consumed-armor`:`hallowed-${form}-ceremonial-armor`}>
    <Part variant={variant} shape={shape} size={design.chest} at={[0,0.68,0]} rotate={[0,form==='rook'?Math.PI/4:0,0]} tone={dark?'cloth':scholar?'cloth':'ivory'} ink/>
    {scholar&&<Part variant={variant} shape="robe" size={[0.43,0.52,0.32]} at={[0,0.37,-0.015]} tone={dark?'cloth':'ivory'} ink/>}
    {form==='queen'&&<Part variant={variant} shape="queenSkirt" size={[0.46,0.46,0.35]} at={[0,0.36,-0.02]} rotate={[0,dark?0.18:0,0]} tone={dark?'cloth':'ivory'} ink/>}
    {form==='rook'&&<Part variant={variant} shape="towerSkirt" size={[0.48,0.32,0.40]} at={[0,0.36,0]} rotate={[0,Math.PI/4,0]} tone="armor" ink/>}
    {form==='king'&&<Part variant={variant} shape="robe" size={[0.43,0.36,0.35]} at={[0,0.38,0]} tone="armor"/>}
    {dark?<>
      <Part variant={variant} shape="abdomen" size={[design.chest[0]*0.62,0.19,design.chest[2]*0.65]} at={[0.025,0.59,-0.03]} tone="cloth"/>
      <Part variant={variant} shape="fracturedPlate" size={[design.chest[0]*0.88,0.30,0.30]} at={[-0.025,0.72,0.04]} rotate={[0,-0.08,-0.08]} tone="metal"/>
      <Part variant={variant} shape="plate" size={[0.07,0.17,0.06]} at={[design.shoulder-0.035,0.77,0.06]} rotate={[0,0,0.25]} tone="armor"/>
      {[-1,0,1].map((s,i)=><Part key={s} variant={variant} shape="raggedCloth" size={[scholar?0.15:0.13,scholar?0.44-i*0.045:0.29-i*0.025,0.8]} at={[s*0.105,scholar?0.34+i*0.01:0.4,0.08]} rotate={[0,s*0.16,s*0.11]} tone="cloth"/>)}
    </>:<>
      <Part variant={variant} shape="plate" size={[design.chest[0]*(form==='queen'?0.40:0.67),scholar?0.30:0.24,0.045]} at={[0,0.70,design.chest[2]*0.44]} tone="metal"/>
      {[-1,1].map(s=><group key={s}>
        <Part variant={variant} shape="cloth" size={[scholar?0.12:0.14,scholar?0.40:0.25,0.5]} at={[s*0.09,scholar?0.33:0.40,0.12]} tone="ivory"/>
        <Part variant={variant} shape="plate" size={[0.02,scholar?0.34:0.18,0.02]} at={[s*0.09,scholar?0.33:0.40,0.16]} tone="accent"/>
        <Part variant={variant} shape="blade" size={[0.035,heavy?0.19:0.14,0.025]} at={[s*0.08,0.72,design.chest[2]*0.58]} rotate={[0,0,s*-0.12]} tone="accent"/>
      </group>)}
    </>}
    <Part variant={variant} shape="octahedron" size={[0.035,0.055,0.025]} at={[dark?0.10:0,0.75,design.chest[2]*0.68]} tone="accent"/>
    {heavy&&!dark&&<Part variant={variant} shape="plate" size={[0.32,0.12,0.055]} at={[0,0.59,0.14]} tone="armor"/>}
    {form==='king'&&!dark&&<Part variant={variant} shape="cloth" size={[0.13,0.34,0.7]} at={[0,0.37,0.15]} tone="accent"/>}
  </group>
}
