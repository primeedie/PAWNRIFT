import { BoxGeometry, ConeGeometry, MeshLambertMaterial, RingGeometry } from 'three'
import { usePawnStore } from '../../game/state/pawnStore'
import type { Attunement } from '../../data/forms'
import type { BiomeMotif } from '../../data/biomes'
import type { Chest } from '../../game/logic/floorContent'
import { floorToken } from '../../game/logic/run'
import { gameplayBlocked, restoreGameFocus } from '../../ui/hudInteraction'
import { consumeInspectionBoardClick } from '../../ui/inspectionStore'

const box=new BoxGeometry(1,1,1),point=new ConeGeometry(1,1,4),ring=new RingGeometry(0.20,0.23,12),fracture=new RingGeometry(0.20,0.24,9,1,0,4.2)
const materials={stone:new MeshLambertMaterial({color:'#71818c',flatShading:true}),wood:new MeshLambertMaterial({color:'#6d594c',flatShading:true}),
  gold:new MeshLambertMaterial({color:'#bda576',flatShading:true}),ivory:new MeshLambertMaterial({color:'#d4cdb4',flatShading:true}),
  void:new MeshLambertMaterial({color:'#706285',flatShading:true}),dark:new MeshLambertMaterial({color:'#37414d',flatShading:true}),paper:new MeshLambertMaterial({color:'#aaadba',flatShading:true})}
function Block({size,at=[0,0,0],tone='stone',rotate=0}:{size:[number,number,number];at?:[number,number,number];tone?:keyof typeof materials;rotate?:number}){
  return <mesh geometry={box} material={materials[tone]} scale={size} position={at} rotation={[0,0,rotate]}/>
}
export function BiomeAdornment({motif}:{motif:BiomeMotif}){
  return <group dispose={null}>
    {motif==='barricade'?<><Block size={[0.9,0.12,0.13]} at={[0,0.3,0]} tone="wood" rotate={0.3}/><Block size={[0.9,0.12,0.13]} at={[0,0.3,0]} tone="wood" rotate={-0.3}/>{[-1,1].map(s=><Block key={s} size={[0.10,0.7,0.12]} at={[s*0.28,0.35,0]} tone="stone"/>)}</>
      :motif==='books'?<>{[0,1,2].map(i=><group key={i} position={[i%2*0.08,i*0.13+0.07,0]} rotation={[0,i*0.3,0]}><Block size={[0.65,0.11,0.44]} tone={i%2?'void':'paper'}/><Block size={[0.68,0.02,0.46]} at={[0,0.065,0]} tone="dark"/></group>)}</>
        :motif==='battlement'?<><Block size={[0.85,0.4,0.25]} at={[0,0.2,0]}/>{[-1,1].map(s=><Block key={s} size={[0.25,0.25,0.3]} at={[s*0.3,0.5,0]} tone="paper"/>)}</>
          :<><Block size={[0.7,0.10,0.6]} at={[0,0.05,0]} tone="dark"/>{[-1,0,1].map(s=><mesh key={s} geometry={point} material={materials.gold} position={[s*0.23,0.27,0]} scale={[0.13,s?0.3:0.45,0.13]}/>)}</>}
  </group>
}
export function RouteExit({alignment}:{alignment:Attunement}){
  const state=usePawnStore(),token=floorToken(state),dark=alignment==='dark'
  return <group name={`${alignment}-route-exit`} dispose={null} onClick={event=>{
    if(state.selectedCardId||state.selectedAbility)return // Let the board's explicit targeting win.
    event.stopPropagation();if(gameplayBlocked())return
    restoreGameFocus();if(!consumeInspectionBoardClick())state.leaveFloor(token,alignment)
  }}>
    <Block size={[0.68,0.07,0.58]} at={[0,0.035,0]} tone={dark?'dark':'ivory'}/>
    {[-1,1].map(s=><group key={s} position={[s*0.25,dark&&s===1?0.23:0.32,0]} rotation={[0,0,dark?s*0.15:0]}><Block size={[dark?0.10:0.12,dark&&s===1?0.42:0.62,0.13]} tone={dark?'void':'ivory'}/></group>)}
    {!dark&&<Block size={[0.64,0.07,0.16]} at={[0,0.65,0]} tone="gold"/>}
    <mesh geometry={dark?fracture:ring} material={dark?materials.void:materials.gold} position={[0,0.36,0.02]} rotation={[0,0,dark?0.5:0]}/>
    {dark&&<Block size={[0.09,0.11,0.14]} at={[0.28,0.63,0.02]} tone="void" rotate={0.45}/>}
  </group>
}
export function TreasureChest({chest}:{chest:Chest}){
  const state=usePawnStore(),floorId=state.floorContent?.id
  return <group name="treasure-chest" dispose={null} onClick={event=>{
    if(state.selectedCardId||state.selectedAbility)return
    event.stopPropagation();if(!floorId||gameplayBlocked())return
    restoreGameFocus();if(!consumeInspectionBoardClick())state.submitAction({kind:'open-chest',floorId,chestId:chest.id})
  }}>
    <Block size={[0.50,0.28,0.34]} at={[0,0.14,0]} tone="wood"/>
    <group position={[0,0.28,-0.16]} rotation={[chest.state==='closed'?0:-1.2,0,0]}><Block size={[0.53,0.09,0.37]} at={[0,0.04,0.16]} tone="dark"/></group>
    {[-1,1].map(s=><Block key={s} size={[0.04,0.3,0.36]} at={[s*0.17,0.15,0]} tone="gold"/>)}
    <Block size={[0.08,0.09,0.025]} at={[0,0.21,0.18]} tone="gold"/>
  </group>
}
