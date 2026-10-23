import type { RefObject } from 'react'
import type { Group } from 'three'
import type { CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

export function Head({form,variant,mane}:{form:CharacterForm;variant:Attunement;mane:RefObject<Group|null>}){
  const dark=variant==='dark'&&form!=='pawn',costume={variant,ronin:form==='pawn'}
  if(form==='pawn')return <group name="ronin-pawn-hood-and-mask">
    <Part {...costume} shape="helm" size={[0.28,0.28,0.26]} tone="dark"/>
    <Part {...costume} shape="hood" size={[0.35,0.37,0.33]} at={[0,0.025,-0.025]} rotate={[0,0,-0.06]} tone="cloth" ink/>
    <Part {...costume} shape="plate" size={[0.19,0.12,0.06]} at={[0,-0.045,0.11]} tone="armor"/>
    <Part {...costume} shape="abdomen" size={[0.20,0.045,0.19]} at={[0,-0.14,0]} tone="metal"/>
    {[-1,1].map(s=><Part key={s} {...costume} shape="plate" size={[0.036,0.014,0.012]} at={[s*0.05,0.025,0.12]} rotate={[0,0,s*0.1]} tone="ivory" ink={false}/>)}
  </group>
  return <group name={dark?`void-${form}-fractured-headwear`:`${form}-head`}>
    <Part variant={variant} shape="helm" size={[dark?0.22:0.29,0.29,0.27]} at={[0,-0.035,0]} tone={dark?'dark':'armor'}/>
    {[-1,1].map(s=><Part key={s} variant={variant} size={[0.038,0.016,0.012]} at={[s*0.055,-0.005,0.13]} tone={dark?'glow':'dark'} ink={false}/>)}
    {form==='knight'&&<>
      <Part variant={variant} shape={dark?'fracturedPlate':'horse'} size={[dark?0.26:0.31,0.36,0.32]} at={[dark?-0.025:0,0.015,0.065]} rotate={[-0.12,0,dark?-0.15:0]} tone="metal"/>
      <Part variant={variant} shape="plate" size={[0.17,0.045,0.035]} at={[0,-0.10,0.255]} tone="dark"/>
      {[-1,1].map(s=><Part key={s} variant={variant} shape="leaf" size={[0.055,dark&&s===1?0.10:0.17,0.065]} at={[s*0.105,0.19,-0.015]} rotate={[0,0,s*-0.18]} tone={dark?'armor':'ivory'}/>)}
      <group ref={mane} name={dark?'fractured-mane':'layered-mane'}>{(dark?[0,2,3]:[0,1,2,3]).map(i=><Part key={i} variant={variant} shape={dark?'raggedCloth':'cloth'} size={[dark?0.11:0.10,0.18+i*0.025,0.7]} at={[dark&&i===2?0.045:0,0.15-i*0.035,-0.08-i*0.055]} rotate={[-0.45,0,dark?(i%2?0.2:-0.17):0]} tone={dark?'accent':'ivory'}/>)}</group>
    </>}
    {form==='bishop'&&<>
      {dark?<>
        <Part variant={variant} shape="fracturedPlate" size={[0.22,0.39,0.15]} at={[-0.055,0.19,0.025]} rotate={[0,-0.12,-0.16]} tone="metal"/>
        <Part variant={variant} shape="raggedCloth" size={[0.16,0.34,0.55]} at={[0.12,0.06,-0.08]} rotate={[0,0,0.15]} tone="cloth"/>
      </>:<>
        {[-1,1].map(s=><Part key={s} variant={variant} shape="mitre" size={[0.30,0.42,0.08]} at={[0,0.19,s*0.065]} rotate={[s*0.10,0,0]} tone="ivory"/>)}
        <Part variant={variant} shape="blade" size={[0.045,0.30,0.025]} at={[0,0.14,0.12]} tone="accent"/>
      </>}
      <Part variant={variant} shape="abdomen" size={[0.33,0.055,0.25]} at={[0,0.025,0]} tone="accent"/>
      {[-1,1].map(s=><Part key={s} variant={variant} shape={dark?'raggedCloth':'cloth'} size={[0.10,0.27,0.45]} at={[s*0.13,-0.07,-0.04]} rotate={[0,s*0.15,s*0.1]} tone="cloth"/>)}
    </>}
    {form==='rook'&&<>
      <Part variant={variant} shape={dark?'fracturedPlate':'cuirass'} size={[0.36,0.30,0.32]} at={[dark?-0.025:0,0.025,-0.025]} tone="armor"/>
      <Part variant={variant} shape="plate" size={[0.21,0.04,0.035]} at={[0,0.035,0.145]} tone="dark"/>
      <Part variant={variant} shape="abdomen" size={[0.37,0.065,0.34]} at={[0,0.13,0]} tone="metal"/>
      {(dark?[-1,1]:[-1,0,1]).map((s,i)=><Part key={s} variant={variant} shape="pauldron" size={[0.10,dark&&s===1?0.10:0.15,0.13]} at={[s*0.12,0.21,0]} rotate={[0,0,dark?(i?0.2:-0.1):0]} tone={dark?'metal':'ivory'}/>)}
    </>}
    {(form==='queen'||form==='king')&&<>
      <Part variant={variant} shape={dark?'brokenRing':'ring'} size={[form==='king'?1.3:1.1,1,0.7]} at={[0,0.13,0]} rotate={[Math.PI/2,0,dark?0.3:0]} tone="metal"/>
      {(dark?[0,1,3]:[0,1,2,3,4]).map((i,index)=><Part key={i} variant={variant} shape={dark?'voidBlade':'greatblade'} size={[form==='king'?0.08:0.06,form==='king'?(i===0?0.33:0.23):(i===0?0.23:0.16),0.05]}
        at={[Math.sin(i*Math.PI*2/5)*0.14,0.24+(dark?index*0.015:0),Math.cos(i*Math.PI*2/5)*0.13]} rotate={[0,i*Math.PI*2/5,dark?(index%2?0.2:-0.13):0]} tone="accent"/>)}
      {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[form==='king'?0.08:0.05,0.19,0.045]} at={[s*0.14,-0.045,0.10]} rotate={[0,0,s*-0.2]} tone="metal"/>)}
      <Part variant={variant} shape="octahedron" size={[0.035,0.055,0.025]} at={[0,0.10,0.15]} tone="accent"/>
    </>}
  </group>
}
