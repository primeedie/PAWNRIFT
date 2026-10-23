import type { CharacterPose } from './characterAnimation'

// Back-mounted shoulder and blade hinges. Presentation only; no range/flight queries.
export function voidMantlePose(p:CharacterPose,side:-1|1){
  const strike=Math.max(0,p.swing)*(side===1?1:0.78),spectacle=p.cast
  const spread=0.08+strike*0.16+spectacle*0.26,advance=strike*(0.33+Math.max(0,p.reach-1)*1.05)
  return {spread,advance,joint:[side*spread/2,-Math.sqrt(Math.max(0,0.48**2-(spread**2+advance**2)/4)),advance/2] as [number,number,number],
    shoulder:[0,side*(0.10-strike*0.65+spectacle*0.40),side*(-0.08-spectacle*0.38)] as [number,number,number],
    hinge:[-strike*1.68-spectacle*0.55,side*strike*-0.18,side*(0.09+spectacle*0.2)] as [number,number,number]}
}
