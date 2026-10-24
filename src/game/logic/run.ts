import { createGame, type GameState } from './combat'
import { createCampaignFloor, canInteract, pendingChest, initialWorldAlignment, type RunProgress } from './floorContent'
import { completeTransformationFloor, recordTransformationBossWin } from './transformations'
import { createEnemy } from './enemyTactics'
import { emptyPassives } from './passives'
import { emptySignatures } from './signatures'
import { createRunDeck } from './deck'
import { floorLocation } from '../../data/biomes'
import type { Attunement } from '../../data/forms'

export function campaignGame(master:string,floor:number,progress:RunProgress){
  const override=progress.layouts[floor],built=createCampaignFloor(master,floor,progress.routes,override?.style,override?.seed)
  const game=createGame(built.dungeon),enemy=game.enemies[0]
  return {...game,floorContent:built.content,occupied:built.content.chests.map(chest=>chest.cell),
    enemies:built.enemyCells.map((cell,index)=>built.enemyKinds[index]?createEnemy(built.enemyKinds[index],`porta-${floor}-${index}`,cell,built.content.alignment):({...enemy,id:`rookling-${index+1}`,cell,from:cell}))}
}
export function newCampaign(master:string,id:string,mode:RunProgress['mode'],style?:import('./dungeon').LayoutStyle){
  const progress:RunProgress={id,mode,initialAlignment:initialWorldAlignment(master),completedAlignments:[],routes:[],cleared:[],bossSkips:[],introduced:['porta'],finished:false,layouts:style?{1:{seed:master,style}}:{}}
  return {...campaignGame(master,1,progress),deck:createRunDeck(master),progress,introBiome:'porta' as const}
}
type CampaignState=GameState&{masterSeed:string;floorNumber:number;progress:RunProgress|null;playtestMode:boolean}
export const floorToken=(state:Pick<CampaignState,'progress'|'floorContent'>)=>`${state.progress?.id}:${state.floorContent?.id}`
export function advanceCampaign(state:CampaignState,token:string,alignment?:Attunement,development=false){
  const {progress,floorContent}=state
  if(!progress||!floorContent||state.mode==='training'||state.hp<=0||progress.finished||token!==floorToken(state)||pendingChest(state)||progress.cleared.includes(state.floorNumber))return null
  const boss=!!floorContent.boss
  if(!development){
    const exit=floorContent.exits.find(exit=>exit.alignment===alignment)
    if((boss&&floorContent.boss?.status!=='defeated')||state.status!=='playing'||state.enemies.some(enemy=>enemy.hp>0)||!exit||!canInteract(state,exit.cell,true)||progress.routes.some(vote=>vote.floor===state.floorNumber))return null
  }
  const updated:RunProgress={...progress,routes:boss?progress.routes:[...progress.routes,{floor:state.floorNumber,alignment:alignment??'light'}],
    completedAlignments:boss?progress.completedAlignments:[...progress.completedAlignments,{floor:state.floorNumber,alignment:floorContent.alignment}],
    cleared:[...progress.cleared,state.floorNumber],bossSkips:boss&&development?[...progress.bossSkips,state.floorNumber]:progress.bossSkips}
  if(state.floorNumber===24)return {progress:{...updated,finished:true},status:'victory' as const,playtestMode:state.playtestMode||development,
    transformations:completeTransformationFloor(state.transformations),passives:emptyPassives(),block:0,blockSources:[],fortified:undefined,preparedCounter:0,guarding:false,
    signatures:{...emptySignatures(),cooldowns:{...state.signatures.cooldowns}}}
  return enterCampaignFloor(state,state.floorNumber+1,updated,state.playtestMode||development)
}

// Resolve once after the real enemy phase (including DoT/counters), before publishing it.
// Debug clearing/removing a wave cannot qualify: the actual boss actor must be dead.
export function settleBossDefeat<T extends GameState & {progress:RunProgress|null;playtestMode:boolean}>(state:T):T {
  const boss=state.floorContent?.boss,actor=state.enemies.find(enemy=>enemy.id==='porta-6-0'&&enemy.boss&&['hallowed-commander','chimera-knight'].includes(enemy.kind))
  if(state.mode==='training'||state.hp<=0||!state.progress||!boss||boss.status!=='active'||!actor||actor.hp>0)return state
  const previous=state.progress.bossClears?.some(clear=>clear.floor===6)
  const eligible=state.progress.mode==='random'&&!state.playtestMode&&!previous
  const transformations=eligible?recordTransformationBossWin(state.transformations,'knight',boss.variant):state.transformations
  return {...state,transformations,floorContent:{...state.floorContent!,boss:{...boss,status:'defeated',rewardResolved:true,rewardGranted:eligible&&transformations.inventory.some(item=>item.form==='knight')}},
    enemies:state.enemies.map(enemy=>({...enemy,attackTarget:undefined,intent:'idle',tactics:enemy.tactics?{...enemy.tactics,pending:undefined}:undefined})),
    progress:{...state.progress,bossClears:previous?state.progress.bossClears:[...(state.progress.bossClears??[]),{floor:6,variant:boss.variant,eligible}]}}
}
export function enterCampaignFloor(state:CampaignState,floor:number,progress:RunProgress,modified:boolean){
  const fresh=campaignGame(state.masterSeed,floor,progress),biome=floorLocation(floor).biome.id
  const introduced=progress.introduced.includes(biome)
  return {...fresh,hp:state.hp,maxHp:state.maxHp,deck:state.deck,energy:state.energy,maxEnergy:state.maxEnergy,focus:state.focus,turn:state.turn,
    transformations:completeTransformationFloor(state.transformations),passives:{...emptyPassives(),...(state.transformations.active?.form==='king'&&state.transformations.active.floorsLeft>1?{smite:state.passives.smite,kingBasics:state.passives.kingBasics}:{})},
    signatures:{...emptySignatures(),cooldowns:{...state.signatures.cooldowns}},floorNumber:floor,playtestMode:modified,
    progress:{...progress,introduced:introduced?progress.introduced:[...progress.introduced,biome]},introBiome:introduced?undefined:biome}
}
