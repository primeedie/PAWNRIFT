import type { RefObject } from 'react'
import type { Group } from 'three'
import type { CharacterForm } from '../../data/characterDesigns'
import type { Attunement } from '../../data/forms'
import { Part } from './CharacterParts'

function VoidHead({form,mane}:{form:CharacterForm;mane:RefObject<Group|null>}){
  const variant='dark'
  return <group name={`void-${form}-fractured-headwear`}>
    <Part variant={variant} shape="sphere" size={[0.16,0.17,0.15]} tone="dark"/>
    {[-1,1].map(s=><Part key={s} variant={variant} size={[0.026,0.02,0.02]} at={[s*0.055,0,0.145]} tone="eye"/>)}
    {form==='knight'&&<>
      <Part variant={variant} shape="plate" size={[0.18,0.24,0.19]} at={[-0.045,0.035,0.12]} rotate={[-0.50,0.16,-0.10]} tone="metal"/>
      <Part variant={variant} shape="plate" size={[0.075,0.16,0.12]} at={[0.14,-0.03,0.06]} rotate={[0,0,0.28]} tone="armor"/>
      <Part variant={variant} shape="cone" size={[0.045,0.13,0.045]} at={[-0.10,0.20,-0.025]} rotate={[0,0,-0.18]} tone="metal"/>
      <group ref={mane} name="fractured-mane">{[0,2,3].map(i=><Part key={i} variant={variant} shape="tornCloth" size={[0.09,0.15+i*0.02,0.06]} at={[i===2?0.035:-0.025,0.20-i*0.03,-0.045-i*0.07]} rotate={[-0.3,0.2,i%2?0.25:-0.25]} tone="accent"/>)}</group>
    </>}
    {form==='bishop'&&<>
      <Part variant={variant} shape="mitre" size={[0.19,0.40,0.06]} at={[-0.07,0.18,0.01]} rotate={[0,-0.15,-0.16]} tone="cloth"/>
      <Part variant={variant} shape="plate" size={[0.10,0.27,0.07]} at={[0.13,0.12,0.01]} rotate={[0,0.20,0.23]} tone="armor"/>
      <Part variant={variant} shape="tornCloth" size={[0.10,0.25,0.05]} at={[-0.14,-0.08,-0.02]} tone="cloth"/>
      <Part variant={variant} size={[0.15,0.028,0.045]} at={[-0.075,0.025,0.11]} rotate={[0,0,-0.13]} tone="metal"/>
    </>}
    {form==='rook'&&<>
      <Part variant={variant} size={[0.10,0.25,0.23]} at={[-0.13,0.035,-0.025]} rotate={[0,0,-0.12]} tone="armor"/>
      <Part variant={variant} size={[0.09,0.18,0.18]} at={[0.14,-0.015,-0.035]} rotate={[0,0,0.17]} tone="metal"/>
      <Part variant={variant} size={[0.24,0.035,0.08]} at={[-0.03,0.12,-0.09]} tone="armor"/>
      {[-1,1].map((s,i)=><Part key={s} variant={variant} shape="plate" size={[0.09,0.17-i*0.055,0.12]} at={[s*0.13,0.19-i*0.04,0.015]} rotate={[0,0,s*0.17]} tone="metal"/>)}
      <Part variant={variant} size={[0.13,0.025,0.025]} at={[-0.04,0.015,0.15]} tone="accent"/>
    </>}
    {(form==='queen'||form==='king')&&<>
      <Part variant={variant} shape="brokenRing" size={[form==='king'?1.3:1.15,0.95,0.6]} at={[0,0.13,0]} rotate={[Math.PI/2,0,0.25]} tone="metal"/>
      {[0,1,3].map((i,index)=><Part key={i} variant={variant} shape="blade" size={[0.08,form==='king'?0.25+index*0.035:0.15+index*0.025,0.045]} at={[Math.sin(i*1.25)*0.15,0.22+index*0.015,Math.cos(i*1.25)*0.13]} rotate={[0,i*1.25,index%2?0.20:-0.14]} tone="accent"/>)}
      <Part variant={variant} shape="tornCloth" size={[0.075,0.20,0.045]} at={[-0.15,-0.04,0.04]} tone="armor"/>
      {form==='king'&&<Part variant={variant} size={[0.14,0.10,0.06]} at={[0.08,0.02,0.11]} rotate={[0,0,0.12]} tone="metal"/>}
    </>}
  </group>
}

export function Head({ form, variant, mane }: { form: CharacterForm; variant: Attunement; mane: RefObject<Group | null> }) {
  const dark = variant === 'dark'
  if(form!=='pawn'&&dark)return <VoidHead form={form} mane={mane}/>
  return <group name={`${form}-head`}>
    <Part variant={variant} shape="sphere" size={form === 'rook' ? [0.16, 0.16, 0.16] : [0.18, 0.18, 0.17]} />
    {[-1, 1].map((side) => <Part key={side} variant={variant} size={[0.027, 0.024, 0.012]} at={[side * 0.055, 0, 0.17]} tone="eye" />)}
    {form === 'pawn' && <>
      <Part variant={variant} shape="sphere" size={[0.185, 0.10, 0.18]} at={[0, 0.09, -0.015]} tone="armor" />
      <Part variant={variant} size={[0.22, 0.035, 0.06]} at={[0, 0.035, 0.145]} tone="ivory" />
      <Part variant={variant} size={[0.07, 0.09, 0.10]} at={[-0.145, -0.045, 0.08]} tone="metal" />
      <Part variant={variant} shape="cylinder" size={[0.15,0.035,0.145]} at={[0,-0.15,0]} tone="ivory" />
      <Part variant={variant} shape="plate" size={[0.12,0.075,0.035]} at={[0,0.12,0.14]} tone="metal" />
      <Part variant={variant} size={[0.035,0.13,0.025]} at={[-0.07,0.08,0.16]} rotate={[0,0,-0.25]} tone="accent" />
    </>}
    {form === 'knight' && <>
      <Part variant={variant} size={[0.27, 0.16, 0.24]} at={[0, 0.04, -0.025]} tone="armor" />
      <Part variant={variant} shape="plate" size={[0.20, 0.22, 0.18]} at={[0, -0.025, 0.18]} rotate={[-0.55,0,0]} tone="metal" />
      <Part variant={variant} size={[0.16,0.045,0.04]} at={[0,-0.075,0.29]} tone="dark" />
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="plate" size={[0.08,0.22,0.18]} at={[side*0.145,-0.055,0.045]} rotate={[0,side*0.12,side*0.1]} tone={dark?'armor':'ivory'} />)}
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="cone" size={[0.035, 0.11, 0.04]} at={[side * 0.10, 0.18, -0.035]} tone="ivory" />)}
      <group ref={mane} name="layered-mane">{[0, 1, 2, 3].map((i) => <Part key={i} variant={variant} shape="plate" size={[0.075, 0.18 - i * 0.015, 0.10]} at={[0, 0.19 - i * 0.025, -0.035 - i * 0.075]} rotate={[-0.35,0,0]} tone={i%2?'cloth':'accent'} />)}</group>
    </>}
    {form === 'bishop' && <>
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="mitre" size={[0.30,0.40,0.065]} at={[0,0.20,side*0.075]} rotate={[side*0.10,0,0]} tone={dark?'cloth':'ivory'} />)}
      <Part variant={variant} size={[0.31,0.045,0.23]} at={[0,0.025,0]} tone="accent" />
      <Part variant={variant} size={[0.035,0.24,0.02]} at={[0,0.12,0.115]} tone="metal" />
      {[-1,1].map(s=><group key={s}>
        <Part variant={variant} shape="plate" size={[0.09,0.27,0.065]} at={[s*0.135,-0.025,-0.035]} rotate={[0,s*0.15,s*0.18]} tone="cloth" />
        <Part variant={variant} size={[0.022,0.23,0.02]} at={[s*0.10,0.16,0.118]} rotate={[0,0,s*-0.25]} tone="accent" />
      </group>)}
    </>}
    {form === 'rook' && <>
      <Part variant={variant} size={[0.31, 0.23, 0.29]} at={[0, 0.03, -0.02]} tone="armor" />
      <Part variant={variant} size={[0.19, 0.035, 0.02]} at={[0, 0, 0.136]} tone="dark" />
      {[-1,1].flatMap((x) => [-1,1].map((z) => <Part key={`${x}:${z}`} variant={variant} size={[0.10,0.13,0.11]} at={[x*0.12,0.20,z*0.10]} tone="ivory" />))}
      <Part variant={variant} size={[0.34,0.045,0.32]} at={[0,0.12,0]} tone="metal" />
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="plate" size={[0.07,0.20,0.10]} at={[side*0.15,-0.04,0.12]} tone="metal" />)}
    </>}
    {form === 'queen' && <>
      <Part variant={variant} shape="cylinder" size={[0.17, 0.055, 0.17]} at={[0, 0.13, 0]} tone="metal" />
      <Part variant={variant} shape="cylinder" size={[0.185,0.025,0.185]} at={[0,0.105,0]} tone="accent" />
      {[0, 1, 2, 3, 4].map((i) => <Part key={i} variant={variant} shape="blade" size={[0.065, i === 0 ? 0.21 : 0.17, 0.035]}
        at={[Math.sin(i * Math.PI * 2 / 5) * 0.15, 0.23, Math.cos(i * Math.PI * 2 / 5) * 0.15]} rotate={[0,i*Math.PI*2/5,0]} tone="accent" />)}
      <Part variant={variant} shape="octahedron" size={[0.035, 0.055, 0.025]} at={[0, 0.095, 0.17]} tone="accent" />
      {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.055,0.17,0.04]} at={[s*0.15,-0.04,0.11]} rotate={[0,0,s*-0.18]} tone={dark?'metal':'accent'}/>)}
    </>}
    {form === 'king' && <>
      <Part variant={variant} size={[0.31,0.14,0.26]} at={[0,0.03,-0.01]} tone="armor" />
      <Part variant={variant} shape="cylinder" size={[0.19,0.06,0.18]} at={[0,0.15,0]} tone="metal" />
      {[-1,0,1].map((side) => <Part key={side} variant={variant} shape="blade" size={[0.09,side?0.23:0.34,0.045]} at={[side*0.13,0.25,0.10]} rotate={[0,side*0.2,side*-0.12]} tone="accent" />)}
      {[-1,1].map((side) => <Part key={side} variant={variant} shape="blade" size={[0.09,0.23,0.055]} at={[side*0.13,0.25,-0.11]} tone="metal" />)}
      <Part variant={variant} shape="octahedron" size={[0.04,0.06,0.03]} at={[0,0.16,0.19]} tone={dark?'ivory':'accent'} />
      <Part variant={variant} size={[0.35,0.025,0.29]} at={[0,0.12,0]} tone="accent" />
      {[-1,1].map(s=><Part key={s} variant={variant} shape="plate" size={[0.085,0.24,0.05]} at={[s*0.15,-0.015,0.10]} rotate={[0,0,s*-0.15]} tone="metal"/>)}
    </>}
    {form!=='pawn'&&<group name="hallowed-sanctity-trim">
      <Part variant={variant} shape="ring" size={[0.90,0.90,0.6]} at={[0,0.13,-0.19]} tone="accent"/>
      {[-1,1].map(s=><Part key={s} variant={variant} size={[0.022,0.14,0.025]} at={[s*0.095,0.055,0.17]} tone="accent"/>)}
    </group>}
  </group>
}
