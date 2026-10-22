import type { CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

export function Spellbook({variant}:{variant:Attunement}) {
  return <group name="open-spellbook" position={[0,0.015,0.035]} rotation={[-0.65,0,0]}>
    <Part variant={variant} size={[0.035,0.23,0.07]} tone="metal" />
    {[-1,1].map(side=><group key={side} rotation={[0,side*-0.38,0]}>
      <Part variant={variant} size={[0.16,0.24,0.035]} at={[side*0.085,0,0]} tone="cloth" />
      <Part variant={variant} size={[0.14,0.21,0.024]} at={[side*0.083,0,0.027]} tone="ivory" />
      {[-0.07,-0.025,0.025,0.07].map(y=><Part key={y} variant={variant} size={[0.09,0.009,0.008]} at={[side*0.083,y,0.044]} tone="accent" />)}
      {[-1,1].map(edge=><Part key={edge} variant={variant} size={[0.16,0.016,0.048]} at={[side*0.085,edge*0.113,0.006]} tone="metal" />)}
    </group>)}
  </group>
}

export function Weapon({form,variant,side=1}:{form:CharacterForm;variant:Attunement;side?:number}) {
  const dark=variant==='dark'
  if(form==='pawn') return null
  if(form==='bishop' && side===-1) return <Spellbook variant={variant}/>
  if(form==='knight') return dark?<group name="dark-combat-spear" scale={0.9}>
    <Part variant={variant} shape="cylinder" size={[0.028,1.05,0.028]} at={[0,0.22,0]} tone="cloth"/>
    <Part variant={variant} shape="leaf" size={[0.17,0.33,0.048]} at={[0,0.84,0]} tone="metal"/>
    <Part variant={variant} shape="leaf" size={[0.025,0.30,0.057]} at={[0,0.84,0]} tone="ivory"/>
    {[-0.24,-0.16,-0.08,0,0.08,0.65].map(y=><Part key={y} variant={variant} shape="cylinder" size={[0.043,0.027,0.043]} at={[0,y,0]} tone={y===0.65?'accent':'dark'}/>)}
    <Part variant={variant} shape="cone" size={[0.028,0.10,0.028]} at={[0,-0.34,0]} rotate={[Math.PI,0,0]} tone="metal"/>
  </group>:<group name="light-cavalry-lance" scale={0.9}>
    <Part variant={variant} shape="cylinder" size={[0.045,0.88,0.045]} at={[0,0.20,0]} tone="cloth"/>
    <Part variant={variant} shape="cone" size={[0.12,0.55,0.12]} at={[0,0.46,0]} rotate={[0,Math.PI/4,0]} tone="armor"/>
    <Part variant={variant} shape="blade" size={[0.14,0.40,0.065]} at={[0,0.79,0]} tone="metal"/>
    <Part variant={variant} shape="blade" size={[0.045,0.37,0.075]} at={[0,0.79,0]} tone="ivory"/>
    <Part variant={variant} shape="cone" size={[0.15,0.13,0.15]} at={[0,0.13,0]} rotate={[Math.PI,0,0]} tone="accent"/>
    <Part variant={variant} shape="cylinder" size={[0.11,0.025,0.11]} at={[0,0.08,0]} tone="metal"/>
    {[-0.13,-0.08,-0.03,0.02].map(y=><Part key={y} variant={variant} shape="cylinder" size={[0.058,0.02,0.058]} at={[0,y,0]} tone="dark"/>)}
    <Part variant={variant} shape="octahedron" size={[0.055,0.09,0.055]} at={[0,-0.26,0]} tone="metal"/>
  </group>
  if(form==='bishop') return <group name={dark?'dark-scholar-focus':'light-runic-staff'}>
    <Part variant={variant} shape="cylinder" size={[0.045,0.86,0.045]} at={[0,0.13,0]} tone="cloth" />
    {[-0.24,-0.1,0.05,0.45,0.58].map(y=><Part key={y} variant={variant} shape="cylinder" size={[0.061,0.028,0.061]} at={[0,y,0]} tone="metal" />)}
    <Part variant={variant} shape="octahedron" size={[0.083,0.14,0.07]} at={[0,0.70,0]} tone="accent" />
    {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.08,0.22,0.06]} at={[s*0.10,0.66,0]} rotate={[0,0,s*-0.3]} tone={dark?'armor':'metal'} />)}
    <Part variant={variant} shape="ring" size={[1.05,1.05,0.8]} at={[0,0.70,0]} tone="metal" />
  </group>
  if(form==='rook') return <group name={dark?'dark-warhammer':'light-greataxe'}>
    <Part variant={variant} shape="cylinder" size={[0.052,0.77,0.052]} at={[0,0.11,0]} tone="cloth" />
    {[-0.18,-0.12,-0.06,0,0.06,0.12].map(y=><Part key={y} variant={variant} shape="cylinder" size={[0.064,0.02,0.064]} at={[0,y,0]} tone="dark" />)}
    <Part variant={variant} shape="octahedron" size={[0.065,0.07,0.065]} at={[0,-0.31,0]} tone="metal" />
    {dark?<>
      <Part variant={variant} size={[0.43,0.24,0.22]} at={[0,0.50,0]} tone="armor" />
      {[-1,1].map(s=><group key={s}>
        <Part variant={variant} size={[0.075,0.27,0.27]} at={[s*0.22,0.50,0]} tone="metal" />
        <Part variant={variant} shape="plate" size={[0.13,0.16,0.04]} at={[s*0.12,0.50,0.13]} tone="accent" />
      </group>)}
    </>:<>
      <Part variant={variant} shape="axe" size={[0.49,0.39,0.09]} at={[0.07,0.48,0]} tone="metal" />
      <Part variant={variant} shape="axe" size={[0.44,0.34,0.10]} at={[0.085,0.49,0.012]} tone="ivory" />
      <Part variant={variant} shape="axe" size={[0.24,0.29,0.09]} at={[-0.14,0.48,0]} rotate={[0,Math.PI,0]} tone="metal" />
    </>}
    <Part variant={variant} size={[0.085,0.28,0.12]} at={[0,0.48,0]} tone="accent" />
  </group>
  if(form==='king') return <group name="training-royal-greatsword" scale={0.88}>
    <Part variant={variant} shape="greatblade" size={[0.30,0.85,0.085]} at={[0,0.62,0]} tone="metal" />
    <Part variant={variant} shape="greatblade" size={[0.22,0.82,0.094]} at={[0,0.62,0]} tone={dark?'armor':'ivory'} />
    <Part variant={variant} size={[0.025,0.57,0.10]} at={[0,0.60,0]} tone="accent" />
    <Part variant={variant} size={[0.43,0.065,0.12]} at={[0,0.18,0]} tone="accent" />
    {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.08,0.17,0.08]} at={[s*0.19,0.15,0]} rotate={[0,0,s*0.55]} tone="metal" />)}
    <Part variant={variant} shape="cylinder" size={[0.049,0.29,0.049]} at={[0,-0.015,0]} tone="cloth" />
    {[-0.13,-0.08,-0.03,0.02,0.07].map(y=><Part key={y} variant={variant} size={[0.065,0.018,0.065]} at={[0,y,0]} tone="accent" />)}
    <Part variant={variant} shape="octahedron" size={[0.085,0.08,0.075]} at={[0,-0.20,0]} tone="metal" />
  </group>
  if(dark) return <group name="dark-dual-knuckle-weapon">
    <Part variant={variant} shape="cylinder" size={[0.11,0.13,0.10]} at={[0,0.025,0]} tone="armor"/>
    <Part variant={variant} size={[0.26,0.095,0.18]} at={[0,0.135,0]} tone="metal"/>
    <Part variant={variant} size={[0.19,0.055,0.19]} at={[0,0.095,0]} tone="armor"/>
    {[-1,0,1].map(i=><Part key={i} variant={variant} shape="octahedron" size={[0.045,0.045,0.055]} at={[i*0.075,0.205,0]} tone="ivory"/>)}
    {[-1,1].map(i=><Part key={i} variant={variant} size={[0.045,0.17,0.17]} at={[i*0.105,0.04,0]} tone="accent"/>)}
  </group>
  return <group name="light-dual-claws">
    <Part variant={variant} shape="plate" size={[0.17,0.18,0.07]} at={[0,0,0.045]} tone="armor"/>
    <Part variant={variant} size={[0.19,0.07,0.12]} at={[0,0.08,0]} tone="metal"/>
    {[-1,0,1].map(i=><group key={i} position={[i*0.060,0.11,0]}>
      <Part variant={variant} shape="claw" size={[0.048,0.32,0.035]} at={[0,0.14,0.015]} tone="metal"/>
      <Part variant={variant} shape="claw" size={[0.018,0.29,0.041]} at={[0.013,0.14,0.016]} tone="ivory"/>
    </group>)}
    <Part variant={variant} shape="octahedron" size={[0.035,0.035,0.035]} at={[0,0.02,0.095]} tone="accent"/>
  </group>
}
