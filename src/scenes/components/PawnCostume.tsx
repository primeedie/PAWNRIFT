import { Part } from './CharacterParts'

export function PawnCostume(){
  const c={variant:'light' as const,ronin:true}
  return <group name="ivory-ronin-layered-costume">
    <Part {...c} shape="lancerTorso" size={[0.28,0.31,0.22]} at={[0,0.67,0]} tone="cloth"/>
    <Part {...c} shape="roninMantle" size={[0.38,0.12,0.32]} at={[0,0.755,-0.015]} tone="ivory" ink/>
    <Part {...c} shape="cloth" size={[0.22,0.23,0.30]} at={[0.005,0.65,0.112]} rotate={[0,0,-0.18]} tone="armor"/>
    <Part {...c} shape="plate" size={[0.15,0.16,0.025]} at={[0.035,0.66,0.14]} rotate={[0,0,-0.12]} tone="metal"/>
    <Part {...c} shape="roninCoat" size={[0.40,0.30,0.31]} at={[0,0.35,-0.02]} tone="armor" ink/>
    {[-1,1].map(s=><Part key={s} {...c} shape="cloth" size={[0.13,s===-1?0.27:0.23,0.30]} at={[s*0.095,0.35,0.11]} rotate={[0,s*0.10,s*-0.12]} tone="ivory"/>)}
  </group>
}
