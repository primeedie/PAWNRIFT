import { characterDesigns, type CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

// Shared joints/anatomy, separate outer constructions. No filled Hallowed shell under Void cutouts.
export function CorruptionArmor({form,variant}:{form:CharacterForm;variant:Attunement}){
  if(form==='pawn')return null
  const design=characterDesigns[form],scholar=form==='bishop',royal=form==='queen'||form==='king',heavy=form==='rook'||form==='king'
  if(variant==='dark')return <group name={`void-${form}-consumed-armor`}>
    {form==='knight'?<>
      <Part variant={variant} shape="voidLancer" size={[0.31,0.38,0.23]} at={[-0.02,0.69,-0.02]} tone="cloth" ink/>
      <Part variant={variant} shape="fracturedPlate" size={[0.25,0.30,0.12]} at={[-0.055,0.72,0.07]} rotate={[0,-0.15,-0.18]} tone="metal"/>
      <Part variant={variant} shape="voidRegalia" size={[0.37,0.32,0.29]} at={[-0.03,0.39,-0.03]} rotate={[0,-0.2,-0.12]} tone="cloth" ink/>
    </>:scholar?<>
      <Part variant={variant} shape="voidLancer" size={[0.25,0.38,0.21]} at={[-0.02,0.70,0]} tone="armor"/>
      <Part variant={variant} shape="voidRegalia" size={[0.46,0.54,0.32]} at={[-0.045,0.37,-0.04]} rotate={[0,-0.25,-0.08]} tone="cloth" ink/>
      <Part variant={variant} shape="fracturedPlate" size={[0.18,0.29,0.06]} at={[-0.10,0.69,0.10]} rotate={[0,0,-0.22]} tone="metal"/>
    </>:<>
      <Part variant={variant} shape="rupturedTorso" size={[design.chest[0],design.chest[1],heavy?0.24:0.17]} at={[-0.02,0.70,0]} rotate={[0,0,form==='queen'?-0.12:0.04]} tone="armor" ink/>
      <Part variant={variant} shape="voidRegalia" size={[form==='rook'?0.46:royal?0.44:0.35,form==='rook'?0.30:0.44,0.31]} at={[-0.025,0.36,-0.015]} rotate={[0,-0.2,-0.08]} tone="cloth" ink/>
      {form==='rook'&&<Part variant={variant} shape="brokenTower" size={[0.25,0.21,0.08]} at={[-0.15,0.34,0.13]} rotate={[0,-0.1,-0.20]} tone="metal"/>}
    </>}
    <Part variant={variant} shape="abdomen" size={[design.chest[0]*0.62,0.14,0.17]} at={[0.02,0.52,-0.025]} tone="dark"/>
    {[-1,1].map((s,i)=><Part key={s} variant={variant} shape="raggedCloth" size={[scholar?0.18:0.14,scholar?(i?0.27:0.48):(i?0.20:0.34),0.6]}
      at={[s*(scholar?0.13:0.11),scholar?0.38:0.37,0.09]} rotate={[0,s*0.28,s*(i?0.24:0.06)]} tone={i?'cloth':'armor'} ink/>)}
    <Part variant={variant} shape="voidBlade" size={[0.08,heavy?0.25:0.18,0.05]} at={[-design.shoulder+0.03,0.78,-0.03]} rotate={[0,0,-0.48]} tone="metal"/>
  </group>
  const shape=form==='rook'?'fortressTorso':form==='queen'?'sovereignTorso':form==='king'?'royalTorso':form==='knight'?'lancerTorso':'robe'
  return <group name={`hallowed-${form}-ceremonial-armor`}>
    <Part variant={variant} shape={shape} size={design.chest} at={[0,0.68,0]} rotate={[0,form==='rook'?Math.PI/4:0,0]} tone={scholar?'cloth':'ivory'} ink/>
    {scholar&&<Part variant={variant} shape="robe" size={[0.43,0.52,0.32]} at={[0,0.37,-0.015]} tone="ivory" ink/>}
    {form==='queen'&&<Part variant={variant} shape="queenSkirt" size={[0.46,0.46,0.35]} at={[0,0.36,-0.02]} tone="ivory" ink/>}
    {form==='rook'&&<Part variant={variant} shape="towerSkirt" size={[0.48,0.32,0.40]} at={[0,0.36,0]} rotate={[0,Math.PI/4,0]} tone="armor" ink/>}
    {form==='king'&&<Part variant={variant} shape="robe" size={[0.43,0.36,0.35]} at={[0,0.38,0]} tone="ivory"/>}
    {[-1,1].map(s=><group key={s}>
      <Part variant={variant} shape="cathedralPlate" size={[scholar?0.09:heavy?0.13:0.09,scholar?0.29:0.23,0.045]} at={[s*(scholar?0.085:design.chest[0]*0.23),0.70,design.chest[2]*0.48]} tone="metal"/>
      <Part variant={variant} shape="cloth" size={[scholar?0.12:0.14,scholar?0.40:0.25,0.5]} at={[s*0.09,scholar?0.33:0.40,0.12]} tone="ivory"/>
      <Part variant={variant} shape="plate" size={[0.02,scholar?0.34:0.18,0.02]} at={[s*0.09,scholar?0.33:0.40,0.16]} tone="accent"/>
    </group>)}
    <Part variant={variant} shape="octahedron" size={[0.035,0.055,0.025]} at={[0,0.75,design.chest[2]*0.68]} tone="accent"/>
    {heavy&&<Part variant={variant} shape="plate" size={[0.32,0.12,0.055]} at={[0,0.59,0.14]} tone="armor"/>}
    {form==='king'&&<Part variant={variant} shape="cloth" size={[0.13,0.34,0.7]} at={[0,0.37,0.15]} tone="accent"/>}
  </group>
}
