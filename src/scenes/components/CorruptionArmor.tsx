import type { CharacterForm } from '../../data/characterDesigns'
import { characterDesigns } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

// Actual open spaces between armor ribs and garment panels, not black decals.
// One shared costume construction with distinct ordered/consumed silhouettes.
export function CorruptionArmor({form,variant}:{form:CharacterForm;variant:Attunement}) {
  if(form==='pawn')return null
  const design=characterDesigns[form],heavy=form==='rook'||form==='king',scholar=form==='bishop'
  if(variant==='light')return <group name={`hallowed-${form}-ceremonial-armor`}>
    <Part variant={variant} size={design.chest} at={[0,0.68,0]} tone="ivory"/>
    <Part variant={variant} shape="plate" size={[design.chest[0]*0.75,0.26,0.045]} at={[0,0.70,design.chest[2]/2+0.025]} tone="metal"/>
    {[-1,1].map(s=><group key={s}>
      <Part variant={variant} shape="plate" size={[heavy?0.20:0.12,0.23,0.045]} at={[s*design.shoulder,0.82,0.04]} rotate={[0,0,s*-0.18]} tone="ivory"/>
      <Part variant={variant} size={[0.022,0.19,0.035]} at={[s*0.08,0.71,design.chest[2]/2+0.06]} tone="accent"/>
      <Part variant={variant} shape="plate" size={[scholar?0.18:0.15,scholar?0.43:0.25,0.08]} at={[s*(scholar?0.11:0.12),scholar?0.33:0.42,0.10]} tone="ivory"/>
      <Part variant={variant} size={[0.025,scholar?0.34:0.17,0.025]} at={[s*0.11,scholar?0.33:0.42,0.15]} tone="accent"/>
      <Part variant={variant} shape="blade" size={[0.055,heavy?0.20:0.14,0.035]} at={[s*design.shoulder,0.89,0.03]} tone="accent"/>
    </group>)}
    <Part variant={variant} shape="octahedron" size={[0.04,0.06,0.025]} at={[0,0.73,design.chest[2]/2+0.075]} tone="accent"/>
    {/* Narrow offset seams interrupt otherwise immaculate porcelain. */}
    <Part variant={variant} size={[0.009,0.08,0.012]} at={[-0.045,0.67,design.chest[2]/2+0.052]} rotate={[0,0,-0.4]} tone="dark"/>
  </group>
  return <group name={`void-${form}-consumed-armor`}>
    <Part variant={variant} size={[design.chest[0]*0.66,design.chest[1]*0.87,design.chest[2]*0.70]} at={[0.025,0.67,-0.025]} tone="cloth"/>
    <Part variant={variant} shape="plate" size={[design.chest[0]*0.40,0.24,0.055]} at={[-design.chest[0]*0.27,0.70,0.13]} rotate={[0,-0.1,-0.17]} tone="armor"/>
    {[0,1,2].map(i=><Part key={i} variant={variant} size={[design.chest[0]*0.57,0.035,0.055]} at={[0.035,0.76-i*0.075,0.14]} rotate={[0,0,i%2?0.13:-0.08]} tone="metal"/>)}
    <Part variant={variant} shape="plate" size={[heavy?0.25:0.17,0.19,0.05]} at={[-design.shoulder-0.025,0.84,0.03]} rotate={[0,0,-0.27]} tone="metal"/>
    <Part variant={variant} shape="plate" size={[0.075,0.11,0.05]} at={[design.shoulder+0.025,0.78,0.06]} rotate={[0,0,0.35]} tone="armor"/>
    {[-1,0,1].map((s,i)=><Part key={s} variant={variant} shape="tornCloth" size={[0.12,scholar?0.40-i*0.06:0.24-i*0.03,0.045]} at={[s*0.12,scholar?0.34+i*0.02:0.42,0.12]} rotate={[0,s*0.15,s*0.11]} tone="cloth"/>)}
    <Part variant={variant} shape="plate" size={[0.06,0.13,0.035]} at={[0.13,0.73,0.16]} rotate={[0,0,0.3]} tone="accent"/>
  </group>
}
