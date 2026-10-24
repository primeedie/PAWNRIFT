import type { PawnState } from './pawnStore'
import { cards, rarities } from '../../data/cards'
import { biomes, floorLocation } from '../../data/biomes'
import { bossForms, testForms } from '../../data/forms'
import { cellId, validCell, validateDungeon, layoutStyles } from '../logic/dungeon'
import { bossVariant, floorContentIssues, initialWorldAlignment, worldAlignment, completedAlignmentHistory } from '../logic/floorContent'
import { blockTotal } from '../logic/protection'
import { enemyIds, enemies as definitions } from '../../data/enemies'

export const runSaveKey='pawnrift:active-run:v1'
const keys=['dungeon','floorContent','cell','facing','hp','maxHp','enemies','occupied','turn','status','guarding','deck','energy','maxEnergy','focus','block','blockSources','fortified','preparedCounter','eventSerial','transformations','passives','signatures','elevation','lastAction','events','visible','explored',
  'from','fromElevation','isMoving','phase','revealAll','hasStartedRun','floorNumber','masterSeed','playtestMode','diagnosticLayers','diagnosticsEnabled','deathRetentionDone','selectedAbility','abilityDestination','selectedCardId','progress'] as const
export function serializeRun(state:PawnState){
  if(state.training||state.tutorial||!state.progress||!state.hasStartedRun)throw Error('Only an actual run can be saved')
  const data=Object.fromEntries(keys.map(key=>[key,key==='visible'||key==='explored'?[...state[key]]:state[key]]))
  return JSON.stringify({version:3,data})
}
function requireValue(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message)}
const integer=(value:unknown,low=0,high=1e9)=>Number.isInteger(value)&&Number(value)>=low&&Number(value)<=high
const object=(value:unknown)=>!!value&&typeof value==='object'&&!Array.isArray(value)
const string=(value:unknown,max=1000)=>typeof value==='string'&&value.length>0&&value.length<=max
const cell=(value:unknown)=>object(value)&&validCell(value as {column:number;row:number})
const unique=(values:unknown[])=>new Set(values).size===values.length
function inspectNumbers(value:unknown,depth=0){
  requireValue(depth<24,'Save nesting is invalid')
  if(typeof value==='number')requireValue(Number.isFinite(value)&&Math.abs(value)<=1e9,'Invalid numeric state')
  if(value&&typeof value==='object')for(const item of Object.values(value))inspectNumbers(item,depth+1)
}
export function deserializeRun(raw:string):Partial<PawnState>{
  requireValue(raw.length<2_000_000,'Save exceeds supported size')
  const envelope=JSON.parse(raw) as {version?:unknown;data?:unknown}
  requireValue(envelope?.version===1||envelope?.version===2||envelope?.version===3,'Unsupported save version; the original save has been preserved')
  requireValue(object(envelope.data),'Missing run data')
  inspectNumbers(envelope.data)
  const d=envelope.data as PawnState,p=d.progress
  requireValue(string(d.masterSeed,200)&&integer(d.floorNumber,1,24)&&object(p)&&string(p?.id)&&['manual','random'].includes(p!.mode),'Invalid run identity')
  requireValue(Array.isArray(p!.routes)&&p!.routes.length<=20&&p!.routes.every(vote=>object(vote)&&integer(vote.floor,1,23)&&vote.floor%6!==0&&['light','dark'].includes(vote.alignment))&&unique(p!.routes.map(vote=>vote.floor)),'Invalid route history')
  requireValue(Array.isArray(p!.cleared)&&p!.cleared.length<=24&&p!.cleared.every(floor=>integer(floor,1,24))&&unique(p!.cleared),'Invalid completed floors')
  requireValue(Array.isArray(p!.bossSkips)&&p!.bossSkips.every(floor=>integer(floor,6,24)&&floor%6===0)&&unique(p!.bossSkips)&&Array.isArray(p!.introduced)&&p!.introduced.every(id=>biomes.some(biome=>biome.id===id))&&typeof p!.finished==='boolean'&&object(p!.layouts),'Invalid progression metadata')
  requireValue(typeof d.playtestMode==='boolean'&&(!p!.bossSkips.length||d.playtestMode),'Development skip lost its classification')
  requireValue(p!.bossClears===undefined||(Array.isArray(p!.bossClears)&&p!.bossClears.length<=1&&p!.bossClears.every(clear=>clear.floor===6&&['light','dark'].includes(clear.variant)&&typeof clear.eligible==='boolean'&&(!clear.eligible||p!.mode==='random'))&&unique(p!.bossClears.map(clear=>clear.floor))),'Invalid boss clear history')
  requireValue(Object.entries(p!.layouts).every(([floor,override])=>integer(Number(floor),1,24)&&object(override)&&string(override.seed,300)&&(override.style===undefined||layoutStyles.includes(override.style))),'Invalid floor override')
  requireValue(p!.routes.every(vote=>vote.floor<d.floorNumber)&&p!.cleared.every(floor=>floor<d.floorNumber||(p!.finished&&floor===24)),'History is ahead of the floor')
  if(envelope.version===1){
    p!.initialAlignment=initialWorldAlignment(d.masterSeed)
    p!.completedAlignments=completedAlignmentHistory(d.masterSeed,p!.cleared,p!.routes,p!.initialAlignment)
    if(object(d.floorContent))d.floorContent!.alignment=worldAlignment(d.masterSeed,d.floorNumber,p!.routes,p!.initialAlignment)
  }
  requireValue(p!.initialAlignment===initialWorldAlignment(d.masterSeed),'Invalid initial world alignment')
  const expectedHistory=completedAlignmentHistory(d.masterSeed,p!.cleared,p!.routes,p!.initialAlignment)
  requireValue(Array.isArray(p!.completedAlignments)&&JSON.stringify(p!.completedAlignments)===JSON.stringify(expectedHistory),'Invalid completed alignment history')
  requireValue(object(d.dungeon)&&Array.isArray(d.dungeon.tiles)&&d.dungeon.tiles.every(tile=>cell(tile)&&typeof tile.blocksMovement==='boolean'&&typeof tile.blocksSight==='boolean')&&validateDungeon(d.dungeon),'Invalid saved map')
  requireValue(d.dungeon.tiles.every(tile=>{
    const decoration=tile.decoration
    return typeof tile.rotation==='number'&&(tile.prop===undefined||['tree','rock','wall','block','crystal'].includes(tile.prop))
      &&(tile.perchHeight===undefined||typeof tile.perchHeight==='number'&&tile.perchHeight>=0&&tile.perchHeight<=0.5)
      &&(decoration===undefined||object(decoration)&&['tree','rock','crystal'].includes(decoration.kind)&&integer(decoration.corner,0,3)
        &&(decoration.motif===undefined||biomes.some(biome=>biome.motif===decoration.motif)))
  }),'Invalid terrain presentation')
  requireValue(cell(d.cell)&&cell(d.from)&&['north','east','south','west'].includes(d.facing)&&integer(d.hp,0,1000000)&&integer(d.maxHp,1,1000000)&&d.hp<=d.maxHp&&integer(d.turn),'Invalid player state')
  requireValue(['playing','defeat','victory'].includes(d.status)&&['ready','player','enemies'].includes(d.phase)&&typeof d.isMoving==='boolean'&&typeof d.guarding==='boolean','Invalid resolution state')
  requireValue(object(d.deck)&&Array.isArray(d.deck.hand)&&Array.isArray(d.deck.draw)&&Array.isArray(d.deck.discard),'Invalid deck')
  const all=[...d.deck.hand,...d.deck.draw,...d.deck.discard]
  requireValue(all.length>=1&&all.length<=500&&unique(all.map(card=>card.instanceId))&&all.every(card=>object(card)&&string(card.instanceId)&&Object.hasOwn(cards,card.definitionId)&&(card.rarity===undefined||rarities.includes(card.rarity))),'Invalid cards')
  requireValue(string(d.deck.seed)&&integer(d.deck.shuffleCount)&&Array.isArray(d.deck.originalStarter)&&d.deck.originalStarter.length===12&&d.deck.originalStarter.every(id=>Object.hasOwn(cards,id)),'Invalid starter record')
  requireValue(integer(d.maxEnergy,1,100)&&integer(d.energy,0,d.maxEnergy)&&integer(d.focus,0,3)&&integer(d.preparedCounter)&&integer(d.eventSerial)&&integer(d.block),'Invalid resources')
  requireValue(Array.isArray(d.blockSources)&&d.blockSources.length<=100&&d.blockSources.every(pool=>string(pool.id)&&string(pool.name)&&integer(pool.amount,1)&&integer(pool.windowsLeft,1,3))&&blockTotal(d.blockSources)===d.block,'Invalid Block pools')
  requireValue(d.fortified===undefined||(object(d.fortified)&&integer(d.fortified.damage,1)&&integer(d.fortified.windowsLeft,1,2)),'Invalid fortified stance')
  const t=d.transformations
  requireValue(object(t)&&Array.isArray(t.inventory)&&t.inventory.length<=2&&unique(t.inventory.map(item=>item.form))&&t.inventory.every(item=>object(item)&&bossForms.some(form=>form===item.form)&&integer(item.charges,0,5)&&Array.isArray(item.attunements)&&item.attunements.length>=1&&item.attunements.length<=2&&unique(item.attunements)&&item.attunements.every(attunement=>['light','dark'].includes(attunement)))&&integer(t.recovery,0,1)&&object(t.reconstruction),'Invalid transformation inventory')
  requireValue(t.active===null||(object(t.active)&&t.inventory.some(item=>item.form===t.active!.form&&item.attunements.includes(t.active!.attunement))&&integer(t.active.floorsLeft,1,2)),'Invalid active transformation')
  requireValue(Object.entries(t.reconstruction).every(([form,value])=>bossForms.some(id=>id===form)&&integer(value,0,2)),'Invalid reconstruction state')
  requireValue(object(d.passives)&&integer(d.passives.sharpener,0,5)&&integer(d.passives.smite,0,10)&&integer(d.passives.kingBasics),'Invalid passive state')
  const s=d.signatures
  requireValue(object(s)&&object(s.cooldowns)&&['pawn',...testForms].every(form=>integer(s.cooldowns[form as keyof typeof s.cooldowns]))&&integer(s.samuraiCharges,0,3)&&typeof s.parryReady==='boolean'&&typeof s.eyeUsed==='boolean','Invalid ability state')
  requireValue(s.reveal===null||(object(s.reveal)&&Array.isArray(s.reveal.cells)&&s.reveal.cells.every(id=>integer(id,0,63))&&integer(s.reveal.turnsLeft,1,2)&&typeof s.reveal.foresight==='boolean'),'Invalid temporary sight')
  const fog=d as unknown as {visible:number[];explored:number[]}
  requireValue([fog.visible,fog.explored].every(set=>Array.isArray(set)&&set.length<=64&&unique(set)&&set.every(id=>integer(id,0,63)))&&fog.visible.every(id=>fog.explored.includes(id)),'Invalid fog memory')
  requireValue(Array.isArray(d.occupied)&&d.occupied.every(cell)&&Array.isArray(d.enemies)&&d.enemies.length<=64&&unique(d.enemies.map(enemy=>enemy.id))&&d.enemies.every(enemy=>object(enemy)&&(enemy.kind==='rookling'||enemyIds.some(id=>id===enemy.kind))&&string(enemy.id)&&cell(enemy.cell)&&cell(enemy.from)&&integer(enemy.hp)&&integer(enemy.maxHp,1)&&enemy.hp<=enemy.maxHp&&['idle','pursue','search','attack'].includes(enemy.intent)&&integer(enemy.searchLeft)),'Invalid enemy state')
  requireValue(d.enemies.every(enemy=>{
    if(enemy.kind==='rookling')return !enemy.tactics
    if(enemy.kind==='dummy')return false
    const t=enemy.tactics,definition=definitions[enemy.kind]
    if(!object(t)||!integer(t!.phase,0,1)||!integer(t!.step)||!integer(t!.recovery,0,20)||!['light','dark'].includes(enemy.variant!)||!integer(enemy.defense??0)||!integer(enemy.block??0)
      ||!!enemy.boss!==(definition.rank==='boss')||!!enemy.elite!==(definition.rank==='elite')
      ||[t!.observed,t!.passive,t!.paused].some(value=>value!==undefined&&typeof value!=='boolean'))return false
    const plan=t!.pending
    return (!t!.lastPattern||definition.patterns.includes(t!.lastPattern))&&(!plan||(object(plan)&&definition.patterns.includes(plan.pattern)&&cell(plan.origin)&&cell(plan.target)
      &&Array.isArray(plan.cells)&&plan.cells.length<=7&&plan.cells.every(cell)&&unique(plan.cells.map(cellId))
      &&Array.isArray(plan.path)&&plan.path.length<=7&&plan.path.every(cell)&&plan.path.every(step=>plan.cells.some(at=>cellId(at)===cellId(step)))))
      &&(enemy.blockSources===undefined||(Array.isArray(enemy.blockSources)&&enemy.blockSources.length<=4&&enemy.blockSources.every(pool=>string(pool.id)&&string(pool.name)&&integer(pool.amount,1)&&integer(pool.windowsLeft,1,3))&&blockTotal(enemy.blockSources)===(enemy.block??0)))
  }),'Invalid enemy tactics or finite protection')
  requireValue(d.enemies.every(enemy=>(!enemy.burn||(object(enemy.burn)&&integer(enemy.burn.turnsLeft,1,2)&&integer(enemy.burn.appliedTurn)))&&(!enemy.bleed||(Array.isArray(enemy.bleed)&&enemy.bleed.length<=3&&enemy.bleed.every(stack=>object(stack)&&integer(stack.turnsLeft,1,3)&&integer(stack.appliedTurn))))),'Invalid damage statuses')
  requireValue(d.enemies.every(enemy=>(enemy.lastSeen===undefined||cell(enemy.lastSeen))&&(enemy.attackTarget===undefined||cell(enemy.attackTarget))
    &&[enemy.exposedTurns,enemy.fearTurns,enemy.weakenedDamage,enemy.concussion,enemy.stunImmunity].every(value=>value===undefined||integer(value))
    &&(enemy.stunned===undefined||typeof enemy.stunned==='boolean')),'Invalid enemy memory or statuses')
  requireValue(Array.isArray(d.events)&&d.events.length<=300&&d.events.every(event=>object(event)&&cell(event.cell)&&string(event.actor)&&integer(event.id)&&typeof event.seen==='boolean'),'Invalid event state')
  requireValue(d.floorContent&&object(d.floorContent),'Missing floor content')
  requireValue(d.floorContent.floor===d.floorNumber&&d.floorContent.biome===floorLocation(d.floorNumber).biome.id&&string(d.floorContent.id)&&Array.isArray(d.floorContent.chests)&&d.floorContent.chests.length<=4&&Array.isArray(d.floorContent.exits),'Invalid floor content')
  requireValue(d.floorContent.alignment===worldAlignment(d.masterSeed,d.floorNumber,p!.routes,p!.initialAlignment),'Invalid current world alignment')
  requireValue(d.floorContent.chests.every(chest=>object(chest)&&string(chest.id)&&cell(chest.cell)&&['closed','opened','claimed','skipped'].includes(chest.state)&&Array.isArray(chest.offer)&&chest.offer.length===3&&chest.offer.every(card=>Object.hasOwn(cards,card.definitionId)&&rarities.includes(card.rarity)))&&unique(d.floorContent.chests.map(chest=>chest.id))&&d.floorContent.chests.filter(chest=>chest.state==='opened').length<=1,'Invalid treasure state')
  requireValue(d.floorContent.exits.every(exit=>cell(exit.cell)&&['light','dark'].includes(exit.alignment)),'Invalid exits')
  if(floorLocation(d.floorNumber).boss)requireValue(d.floorContent.boss&&['unimplemented',...(d.floorNumber===6?['active','defeated']:[])].includes(d.floorContent.boss.status)&&cell(d.floorContent.boss.spawn)&&d.floorContent.boss.variant===bossVariant(p!.routes,d.floorNumber),'Invalid boss manifestation')
  else requireValue(!d.floorContent.boss,'Unexpected boss record')
  // Generation reserves initial enemy cells; moving enemies may later stand on an exit or the old spawn.
  requireValue(floorContentIssues(d.dungeon,d.floorContent).length===0,'Saved content overlaps or is unreachable')
  const alive=d.enemies.filter(enemy=>enemy.hp>0)
  requireValue(unique(alive.map(enemy=>cellId(enemy.cell)))&&alive.every(enemy=>d.dungeon.tiles.some(tile=>cellId(tile)===cellId(enemy.cell)&&!tile.blocksMovement)&&!d.occupied.some(position=>cellId(position)===cellId(enemy.cell))),'Invalid occupied enemy position')
  requireValue(unique(d.occupied.map(cellId))&&d.occupied.length===d.floorContent.chests.length&&d.occupied.every(position=>d.floorContent!.chests.some(chest=>cellId(chest.cell)===cellId(position))),'Invalid chest collision data')
  requireValue(!d.occupied.some(position=>cellId(position)===cellId(d.cell))&&!d.enemies.some(enemy=>enemy.hp>0&&cellId(enemy.cell)===cellId(d.cell)),'Occupied player position')
  requireValue(d.dungeon.tiles.some(tile=>cellId(tile)===cellId(d.cell)&&(!tile.blocksMovement||(t.active?.form==='knight'&&tile.perchHeight!==undefined))),'Player in solid terrain')
  requireValue(Array.isArray(d.diagnosticLayers)&&typeof d.diagnosticsEnabled==='boolean'&&typeof d.deathRetentionDone==='boolean'&&typeof d.selectedAbility==='boolean'&&typeof d.revealAll==='boolean','Invalid controls')
  const restored=Object.fromEntries(keys.map(key=>[key,key==='visible'?new Set(fog.visible):key==='explored'?new Set(fog.explored):d[key]])) as Partial<PawnState>
  return {...restored,mode:'run',training:null,tutorial:null,runActive:false,hasStartedRun:true,introBiome:undefined,
    saveNotice:envelope.version===1?'Save upgraded: historical world themes inferred from the seed and exit history. All run data preserved.':undefined}
}
export function localRunStorage(){try{return typeof localStorage==='undefined'?undefined:localStorage}catch{return undefined}}
export function readRunSave(storage:Pick<Storage,'getItem'>|undefined=localRunStorage()):{data?:Partial<PawnState>;error?:string}{
  try{const raw=storage?.getItem(runSaveKey);return raw===null||raw===undefined?{}:{data:deserializeRun(raw)}}catch(error){return {error:`Run save unavailable: ${error instanceof Error?error.message:'invalid data'}. It has not been erased.`}}
}
