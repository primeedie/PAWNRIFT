import type { RefObject } from 'react'
import type { Group } from 'three'
import type { CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

export function Head({form,variant,mane}:{form:CharacterForm;variant:Attunement;mane:RefObject<Group|null>}){
  const dark=variant==='dark'&&form!=='pawn',c={variant,ronin:form==='pawn'}
  if(form==='pawn')return <group name="ivory-ronin-rounded-pawn-crown">
    <Part {...c} shape="pawnCrown" size={[0.35,0.33,0.34]} tone="armor" ink/>
    <Part {...c} shape="pawnCowl" size={[0.38,0.35,0.36]} at={[0,0.008,-0.012]} tone="ivory" ink/>
    <Part {...c} shape="plate" size={[0.22,0.085,0.025]} at={[0,-0.035,0.154]} tone="dark" ink={false}/>
    <Part {...c} shape="abdomen" size={[0.17,0.09,0.16]} at={[0,-0.19,0]} tone="dark"/>
    <Part {...c} shape="abdomen" size={[0.27,0.045,0.25]} at={[0,-0.23,0]} tone="ivory"/>
    {[-1,1].map(s=><group key={s}>
      <Part {...c} shape="plate" size={[0.055,0.12,0.04]} at={[s*0.112,-0.055,0.12]} rotate={[0,s*0.2,s*0.15]} tone="metal"/>
      <Part {...c} size={[0.042,0.012,0.015]} at={[s*0.05,-0.02,0.17]} tone="ivory" ink={false}/>
    </group>)}
  </group>
  if(form==='knight')return <group name={`${variant}-equine-chess-head`}>
    <Part {...c} shape="lancerTorso" size={[0.25,0.24,0.25]} at={[0,-0.18,-0.06]} rotate={[-0.2,0,0]} tone="armor"/>
    <Part {...c} shape={dark?'voidEquine':'equine'} size={[dark?0.60:0.55,dark?0.43:0.48,dark?0.20:0.25]} at={[dark?-0.025:0,0.015,0.03]} rotate={[0,-Math.PI/2,dark?-0.08:0]} tone={dark?'metal':'ivory'} ink/>
    {!dark&&<Part {...c} shape="plate" size={[0.15,0.05,0.04]} at={[0,-0.095,0.32]} tone="dark"/>}
    {[-1,1].map(s=><group key={s}>
      <Part {...c} shape="leaf" size={[0.055,dark&&s===1?0.115:0.17,0.07]} at={[s*0.08,0.27,-0.10]} rotate={[0,0,s*-0.2]} tone="armor"/>
      <Part {...c} shape="plate" size={[0.035,0.13,0.17]} at={[s*0.12,-0.02,0.08]} rotate={[0,s*0.15,0]} tone={dark?'armor':'accent'}/>
      <Part {...c} size={[0.018,0.025,0.045]} at={[s*0.12,0.07,0.11]} tone={dark?'glow':'dark'} ink={false}/>
    </group>)}
    <group ref={mane} name="sculpted-equine-mane">
      <Part {...c} shape={dark?'voidMane':'mane'} size={[dark?0.25:0.17,dark?0.51:0.48,dark?0.085:0.13]} at={[dark?-0.035:0,0.015,dark?-0.19:-0.16]} rotate={[0,-Math.PI/2,dark?-0.12:0]} tone={dark?'cloth':'ivory'} ink/>
      {dark&&<Part {...c} shape="voidBlade" size={[0.055,0.22,0.06]} at={[0.08,0.12,-0.19]} rotate={[-0.3,0,-0.3]} tone="accent"/>}
    </group>
  </group>
  if(form==='bishop')return <group name={`${variant}-notched-chess-mitre`}>
    <Part {...c} shape="helm" size={[0.22,0.23,0.21]} at={[0,-0.08,0]} tone="dark"/>
    <Part {...c} shape={dark?'voidMitre':'chessMitre'} size={[dark?0.32:0.34,dark?0.50:0.52,dark?0.12:0.14]} at={[dark?-0.055:0,0.16,-0.015]} rotate={[0,dark?0.05:0.30,dark?-0.19:0]} tone={dark?'armor':'ivory'} ink/>
    <Part {...c} shape="abdomen" size={[0.29,0.065,0.25]} at={[0,-0.10,0]} tone="accent"/>
    <Part {...c} shape="plate" size={[0.12,0.12,0.025]} at={[0,-0.08,0.13]} tone="metal"/>
    {(dark?[-1]:[-1,1]).map(s=><Part key={s} {...c} shape={dark?'raggedCloth':'cloth'} size={[0.08,0.27,0.5]} at={[s*0.12,-0.19,-0.05]} tone="cloth"/>)}
  </group>
  if(form==='rook')return <group name={`${variant}-castle-tower-head`}>
    <Part {...c} shape={dark?'brokenTower':'towerHelm'} size={[dark?0.42:0.40,dark?0.38:0.35,dark?0.27:0.32]} at={[dark?-0.025:0,0.015,0]} rotate={[0,dark?-0.10:0,dark?-0.08:0]} tone={dark?'armor':'ivory'} ink/>
    <Part {...c} size={[0.26,0.035,0.026]} at={[0,-0.005,0.18]} tone="dark"/>
    {!dark&&<Part {...c} shape="plate" size={[0.22,0.17,0.045]} at={[0,-0.10,0.17]} tone="metal"/>}
    {dark?<Part {...c} shape="fracturedPlate" size={[0.16,0.23,0.10]} at={[-0.17,0.025,0.15]} rotate={[0,-0.2,-0.10]} tone="metal"/>
      :[-1,1].map(s=><Part key={s} {...c} size={[0.035,0.27,0.025]} at={[s*0.16,-0.015,0.18]} tone="accent"/>)}
  </group>
  const king=form==='king'
  return <group name={`${variant}-${form}-royal-head`}>
    <Part {...c} shape={dark?'voidRoyalMask':'helm'} size={[king?0.29:0.22,king?0.28:0.27,dark?0.16:0.23]} at={[dark?-0.035:0,-0.045,0]} rotate={[0,0,dark?-0.10:0]} tone={dark?'armor':'ivory'}/>
    <Part {...c} shape={dark?'brokenRing':'ring'} size={[king?1.18:1.02,king?1.18:1.02,0.6]} at={[0,0.09,0]} rotate={[Math.PI/2,0,dark?0.4:0]} tone="accent"/>
    {(dark?[0,1,3,4]:[0,1,2,3,4]).map((i,index)=><Part key={i} {...c} shape={dark?'voidBlade':'greatblade'}
      size={[king?0.07:0.065,(king?0.19:0.26+(i===0?0.04:0))*(dark?(index%2?0.6:1.25):1),0.045]}
      at={[Math.sin(i*Math.PI*2/5)*(king?0.13:0.15)+(dark?-0.015:0),king?0.16:0.18,Math.cos(i*Math.PI*2/5)*0.13]}
      rotate={[0,i*Math.PI*2/5,dark?(index%2?0.16:-0.08):Math.sin(i*Math.PI*2/5)*-0.22]} tone="accent"/>)}
    {king&&<>
      <Part {...c} shape={dark?'fracturedCross':'royalCross'} size={[0.28,0.39,0.065]} at={[dark?-0.04:0,0.35,0]} rotate={[0,0,dark?-0.16:0]} tone={dark?'metal':'ivory'} ink/>
      <Part {...c} shape="octahedron" size={[0.035,0.045,0.025]} at={[0,0.40,0.05]} tone="accent"/>
    </>}
    {[-1,1].map(s=><Part key={s} {...c} shape={king?'plate':'leaf'} size={[king?0.075:0.045,0.18,0.045]} at={[s*(king?0.14:0.115),-0.055,0.09]} rotate={[0,0,s*-0.18]} tone="metal"/>)}
  </group>
}
