import { biomes, floorLocation, treasureBalance, type BiomeId } from '../../data/biomes'
import { cards, rarities, type CardId, type Rarity } from '../../data/cards'
import type { Attunement } from '../../data/forms'
import { seededRandom } from '../../utils/seededRandom'
import { cellId, cellFromId, distancesFrom, fallbackDungeon, floorSeed, generateDungeon, neighborIds, validateDungeon, type Dungeon, type LayoutStyle } from './dungeon'
import { sameCell, type Cell } from './movement'
import type { GameState } from './combat'
import { hasLineOfSight } from './enemyAI'
import { BALANCE_PENDING_USER_DOCUMENT as fixture, type EnemyId } from '../../data/enemies'

export type RouteVote={floor:number;alignment:Attunement}
export type RunProgress={id:string;mode:'random'|'manual';initialAlignment:Attunement;completedAlignments:RouteVote[];routes:RouteVote[];cleared:number[];bossSkips:number[];bossClears?:{floor:number;variant:Attunement;eligible:boolean}[];introduced:BiomeId[];finished:boolean;layouts:Record<number,{seed:string;style?:LayoutStyle}>}
export type RewardCard={definitionId:CardId;rarity:Rarity}
export type Chest={id:string;cell:Cell;state:'closed'|'opened'|'claimed'|'skipped';offer:RewardCard[]}
export type FloorContent={id:string;floor:number;biome:BiomeId;alignment:Attunement;exits:{alignment:Attunement;cell:Cell}[];chests:Chest[];
  boss?:{name:string;identity:typeof biomes[number]['identity'];variant:Attunement;spawn:Cell;status:'unimplemented'|'active'|'defeated';rewardResolved?:boolean;rewardGranted?:boolean}}
export const seedStream=(master:string,floor:number,system:string)=>`${master}:floor:${floor}:${system}:v1`
export const initialWorldAlignment=(master:string):Attunement=>seededRandom(`${master}:world-alignment:v1`)()<0.5?'light':'dark'
export function worldAlignment(master:string,floor:number,routes:readonly RouteVote[],initial=initialWorldAlignment(master)):Attunement{
  if(floorLocation(floor).boss)return bossVariant(routes,floor)
  // A boss arena uses the majority; the fifth exit still sets the next ordinary floor.
  return [...routes].filter(vote=>vote.floor<floor).sort((a,b)=>b.floor-a.floor)[0]?.alignment??initial
}
export function completedAlignmentHistory(master:string,cleared:readonly number[],routes:readonly RouteVote[],initial=initialWorldAlignment(master)){
  return cleared.filter(floor=>floor%6!==0).map(floor=>({floor,alignment:worldAlignment(master,floor,routes,initial)}))
}
export function alignmentCounts(routes:readonly RouteVote[],floor:number){
  const base=Math.floor((floor-1)/6)*6
  const votes=routes.filter(vote=>vote.floor>base&&vote.floor<=base+5)
  return {light:votes.filter(vote=>vote.alignment==='light').length,dark:votes.filter(vote=>vote.alignment==='dark').length}
}
export function bossVariant(routes:readonly RouteVote[],floor:number):Attunement{
  const counts=alignmentCounts(routes,floor)
  if(counts.light+counts.dark!==5)throw Error('Boss manifestation requires five route votes')
  return counts.light>counts.dark?'light':'dark'
}
export function treasureOffer(master:string,floor:number,id:string):RewardCard[]{
  const random=seededRandom(seedStream(master,floor,`reward:${id}`)),pool=Object.keys(cards) as CardId[]
  const weights=treasureBalance.weights[floorLocation(floor).index]
  return Array.from({length:3},()=>{
    let roll=random()*weights.reduce((sum,n)=>sum+n,0),tier=0
    while(tier<weights.length-1&&(roll-=weights[tier])>=0)tier++
    return {definitionId:pool.splice(Math.floor(random()*pool.length),1)[0],rarity:rarities[tier]}
  })
}
export function floorContentIssues(dungeon:Dungeon,content:FloorContent,enemyCells:readonly Cell[]=[]){
  const open=new Set(dungeon.tiles.filter(tile=>!tile.blocksMovement&&!content.chests.some(chest=>sameCell(chest.cell,tile))).map(cellId))
  const reachable=distancesFrom(open,cellId(dungeon.spawn)),used=new Set([cellId(dungeon.spawn)])
  const issues:string[]=[]
  if(!validateDungeon(dungeon))issues.push('Invalid dungeon terrain')
  for(const cell of [...content.exits.map(exit=>exit.cell),...content.chests.map(chest=>chest.cell),...enemyCells]){
    const id=cellId(cell)
    if(used.has(id))issues.push('Overlapping content');used.add(id)
    if(!dungeon.tiles.some(tile=>sameCell(tile,cell)&&!tile.blocksMovement))issues.push('Content outside walkable terrain')
  }
  if(content.exits.some(exit=>!reachable.has(cellId(exit.cell))))issues.push('Exit not Pawn-reachable')
  if(content.chests.some(chest=>!neighborIds(cellId(chest.cell)).some(id=>reachable.has(id))))issues.push('Chest cannot be approached')
  if(enemyCells.some(cell=>!reachable.has(cellId(cell))))issues.push('Unreachable enemy')
  if(!content.boss&&(content.exits.length!==2||new Set(content.exits.map(exit=>exit.alignment)).size!==2))issues.push('Missing route choice')
  if(content.chests.some(chest=>chest.offer.length!==3||new Set(chest.offer.map(card=>card.definitionId)).size!==3))issues.push('Invalid reward offer')
  return issues
}
export function createCampaignFloor(master:string,floor:number,routes:readonly RouteVote[],style?:LayoutStyle,override?:string,safe=false){
  if(!Number.isInteger(floor)||floor<1||floor>24)throw Error('Invalid campaign floor')
  const location=floorLocation(floor),seed=override??floorSeed(master,floor)
  let dungeon=location.boss||safe?{...fallbackDungeon(seed),reservations:[]}:generateDungeon(seed,style,{obstacles:`${seed}:obstacles`,environment:`${seed}:environment`})
  const content:FloorContent={id:seedStream(master,floor,'content'),floor,biome:location.biome.id,alignment:worldAlignment(master,floor,routes),exits:[],chests:[]}
  if(location.boss){
    content.boss={name:location.biome.boss,identity:location.biome.identity,variant:bossVariant(routes,floor),spawn:{column:4,row:3},status:'unimplemented'}
    if(floor===6){
      content.boss={...content.boss,name:content.alignment==='light'?'Hallowed Cavalry Commander':'Void Chimera Knight',status:'active'}
      // Dedicated court: matched Hallowed barricades versus displaced, fractured Void cover.
      const walls=content.alignment==='light'?[18,21,42,45]:[17,22,41,46]
      dungeon={...dungeon,spawn:{column:3,row:6},exit:{column:3,row:1},tiles:Array.from({length:64},(_,id)=>({
        ...cellFromId(id),blocksMovement:walls.includes(id),blocksSight:walls.includes(id),prop:walls.includes(id)?'wall' as const:undefined,rotation:0,
        ...([0,7,56,63].includes(id)?{decoration:{kind:'rock' as const,corner:id%4,motif:'barricade' as const}}:{})}))}
      content.exits=[{alignment:content.alignment,cell:{...dungeon.exit}}]
    }
    return {dungeon,content,enemyCells:floor===6?[content.boss.spawn]:[] as Cell[],enemyKinds:floor===6?[content.alignment==='light'?'hallowed-commander':'chimera-knight'] as EnemyId[]:[]}
  }
  const open=new Set(dungeon.tiles.filter(tile=>!tile.blocksMovement).map(cellId)),spawn=cellId(dungeon.spawn)
  const distances=distancesFrom(open,spawn),fromExit=distancesFrom(open,cellId(dungeon.exit))
  const choices=[...open].filter(id=>id!==spawn&&id!==cellId(dungeon.exit)).sort((a,b)=>(distances.get(b)??0)-(distances.get(a)??0)||a-b)
  const alternate=choices.find(id=>(fromExit.get(id)??0)>=3&&(distances.get(id)??0)>=3)??choices[0]
  content.exits=[{alignment:'light',cell:{...dungeon.exit}},{alignment:'dark',cell:cellFromId(alternate)}]
  const exitIds=new Set(content.exits.map(exit=>cellId(exit.cell)))
  const treasureRandom=seededRandom(seedStream(master,floor,'treasure-placement'))
  const chestCandidates=[...open].filter(id=>id!==spawn&&!exitIds.has(id)).filter(id=>{
    const remaining=new Set([...open].filter(other=>other!==id)),reachable=distancesFrom(remaining,spawn)
    return reachable.size===remaining.size&&[...exitIds].every(exit=>reachable.has(exit))&&neighborIds(id).some(neighbor=>reachable.has(neighbor))
  }).sort((a,b)=>((distances.get(b)??0)+(fromExit.get(b)??0))-((distances.get(a)??0)+(fromExit.get(a)??0))||a-b)
  if(chestCandidates.length&&treasureRandom()<treasureBalance.chance){
    const cell=cellFromId(chestCandidates[Math.floor(treasureRandom()*Math.min(8,chestCandidates.length))])
    content.chests=[{id:'chest-0',cell,state:'closed',offer:treasureOffer(master,floor,'chest-0')}]
  }
  const enemyRandom=seededRandom(seedStream(master,floor,'enemy-placement'))
  const candidates=[...open].filter(id=>id!==spawn&&!exitIds.has(id)&&!content.chests.some(chest=>cellId(chest.cell)===id)&&(distances.get(id)??0)>=2)
  const enemyKinds:EnemyId[]=location.index===0?[...fixture.encounters[location.local-1]]:[]
  const desired=location.index===0?enemyKinds.length:1
  const enemyCells:Cell[]=[]
  // Independent placement stream; reserve a safe opening and distinct cells, never alter routes.
  const safeCandidates=candidates.filter(id=>(distances.get(id)??0)>=(location.index===0?fixture.safeSpawnDistance:2))
  for(let index=0;index<desired&&safeCandidates.length;index++)enemyCells.push(cellFromId(safeCandidates.splice(Math.floor(enemyRandom()*safeCandidates.length),1)[0]))
  dungeon={...dungeon,tiles:dungeon.tiles.map(tile=>({...tile,
    decoration:exitIds.has(cellId(tile))||content.chests.some(chest=>sameCell(chest.cell,tile))||enemyCells.some(cell=>sameCell(cell,tile))?undefined
      :tile.decoration?{...tile.decoration,motif:location.biome.motif}:undefined})),
    reservations:[{...content.exits[1].cell,kind:'alternate-exit'},...enemyCells.map(cell=>({...cell,kind:'enemy' as const})),...content.chests.map(chest=>({...chest.cell,kind:'treasure' as const}))]}
  const issues=floorContentIssues(dungeon,content,enemyCells)
  if(issues.length){if(!safe)return createCampaignFloor(master,floor,routes,style,override,true);throw Error(issues.join('; '))}
  return {dungeon,content,enemyCells,enemyKinds:enemyKinds.slice(0,enemyCells.length)}
}
export function canInteract(state:GameState,cell:Cell,standOn=false){
  return state.status==='playing'&&state.hp>0&&state.visible.has(cellId(cell))&&hasLineOfSight(state.dungeon,state.cell,cell)
    &&((standOn&&sameCell(state.cell,cell))||Math.abs(state.cell.column-cell.column)+Math.abs(state.cell.row-cell.row)===1)
}
export const pendingChest=(state:GameState)=>state.floorContent?.chests.find(chest=>chest.state==='opened')
