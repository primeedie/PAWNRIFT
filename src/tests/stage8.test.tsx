import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePawnStore } from '../game/state/pawnStore'
import { deserializeRun, readRunSave, runSaveKey, serializeRun } from '../game/state/runPersistence'
import { alignmentCounts, bossVariant, createCampaignFloor, floorContentIssues, pendingChest, seedStream, treasureOffer, type RouteVote } from '../game/logic/floorContent'
import { floorToken } from '../game/logic/run'
import { createRunDeck, selectStartingCards } from '../game/logic/deck'
import { canMove, sameCell, type Cell } from '../game/logic/movement'
import { cellFromId, cellId, generateDungeon, neighborIds } from '../game/logic/dungeon'
import { attackTargets, movementBoard, resolveTurn } from '../game/logic/combat'
import { updateFog } from '../game/logic/visibility'
import { emptyTransformations } from '../game/logic/transformations'
import { coreStarterCards, cards, cardDefinition, rarities, starterCopyCap } from '../data/cards'
import { biomes } from '../data/biomes'
import { cardPresentationFor } from '../data/cardPresentation'
import { plainCardText } from '../data/glossary'
import { CardIllustration } from '../ui/CardIllustration'
import { CardHand } from '../ui/CardHand'
import { TreasureReward } from '../ui/TreasureReward'
import { RunHUD } from '../ui/RunHUD'
import { createTraining } from '../game/logic/training'
import { RouteExit, TreasureChest } from '../scenes/components/FloorObjects'
import { useInspectionStore } from '../ui/inspectionStore'

vi.mock('../game/state/pawnStore',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../game/state/pawnStore')>()
  return {...actual,usePawnStore:Object.assign((selector?:(state:ReturnType<typeof actual.usePawnStore.getState>)=>unknown)=>{
    const state=actual.usePawnStore.getState();return selector?selector(state):state
  },actual.usePawnStore)}
})
const original=usePawnStore.getState(),c=(column:number,row:number)=>({column,row})
function finish(){let state=usePawnStore.getState();const id=state.actionId;state.advancePlayback(id,'player');state=usePawnStore.getState();state.advancePlayback(id,'enemies')}
function act(action:Parameters<typeof original.submitAction>[0]){expect(usePawnStore.getState().submitAction(action)).toBe(true);finish()}
function path(from:Cell,to:Cell){
  const s=usePawnStore.getState(),board=movementBoard(s),queue=[from],prior=new Map<number,number|undefined>([[cellId(from),undefined]])
  for(let index=0;index<queue.length;index++){
    const at=queue[index];if(sameCell(at,to))break
    for(const id of neighborIds(cellId(at))){const cell=cellFromId(id);if(!prior.has(id)&&canMove(at,cell,board)){prior.set(id,cellId(at));queue.push(cell)}}
  }
  if(!prior.has(cellId(to)))return []
  const result:Cell[]=[];let id:number|undefined=cellId(to)
  while(id!==undefined&&id!==cellId(from)){result.unshift(cellFromId(id));id=prior.get(id)}
  return result
}
function walkTo(to:Cell){
  for(let i=0;i<80&&!sameCell(usePawnStore.getState().cell,to);i++){
    const s=usePawnStore.getState(),next=path(s.cell,to)[0];expect(next).toBeDefined();act({kind:'move',destination:next})
  }
  expect(usePawnStore.getState().cell).toEqual(to)
}
function clearFloor(){
  for(let i=0;i<160&&usePawnStore.getState().enemies.some(enemy=>enemy.hp>0);i++){
    const s=usePawnStore.getState(),target=attackTargets(s)[0]
    if(target){act(target.intent==='attack'&&target.attackTarget&&sameCell(target.attackTarget,s.cell)?{kind:'defend'}:{kind:'attack',targetId:target.id})}
    else {
      const enemy=s.enemies.find(enemy=>enemy.hp>0)!,routes=neighborIds(cellId(enemy.cell)).map(cellFromId).map(cell=>path(s.cell,cell)).filter(route=>route.length)
      routes.sort((a,b)=>a.length-b.length);expect(routes[0]?.[0]).toBeDefined();act({kind:'move',destination:routes[0][0]})
    }
    expect(usePawnStore.getState().hp).toBeGreaterThan(0)
  }
  expect(usePawnStore.getState().enemies.every(enemy=>enemy.hp===0)).toBe(true)
}
function leave(alignment:'light'|'dark'='light'){
  const s=usePawnStore.getState(),exit=s.floorContent!.exits.find(exit=>exit.alignment===alignment)!
  usePawnStore.setState({enemies:s.enemies.map(enemy=>({...enemy,hp:0}))});walkTo(exit.cell)
  const token=floorToken(usePawnStore.getState());expect(usePawnStore.getState().leaveFloor(token,alignment)).toBe(true)
  return token
}
function chestSetup(){
  for(let seed=0;seed<100;seed++){
    usePawnStore.getState().loadDungeon(`chest-test-${seed}`)
    if(usePawnStore.getState().floorContent?.chests.length)break
  }
  const s=usePawnStore.getState(),chest=s.floorContent!.chests[0]
  const position=neighborIds(cellId(chest.cell)).map(cellFromId).find(cell=>s.dungeon.tiles.some(tile=>sameCell(tile,cell)&&!tile.blocksMovement))!
  const enemyCell=neighborIds(cellId(position)).map(cellFromId).find(cell=>!sameCell(cell,chest.cell)&&s.dungeon.tiles.some(tile=>sameCell(tile,cell)&&!tile.blocksMovement))!
  const enemy={...s.enemies[0],cell:enemyCell,from:enemyCell,intent:'attack' as const,attackTarget:position}
  usePawnStore.setState({cell:position,from:position,enemies:[enemy],...updateFog(s.dungeon.tiles,position)})
  return {chest,token:floorToken(usePawnStore.getState()),action:{kind:'open-chest' as const,floorId:s.floorContent!.id,chestId:chest.id}}
}
beforeEach(()=>{usePawnStore.setState({...original,transformations:emptyTransformations(),saveError:undefined,training:null,tutorial:null},true);usePawnStore.getState().loadDungeon('stage-eight')})
afterEach(()=>{if(usePawnStore.getState().tutorial)usePawnStore.getState().exitTutorial();if(usePawnStore.getState().training)usePawnStore.getState().leaveTraining();useInspectionStore.getState().dismiss();vi.unstubAllGlobals();usePawnStore.setState(original,true)})

describe('Stage 8 seeded floor generation',()=>{
  it('validates 100 seeds across all 24 floors using actual Pawn steps',()=>{
    let chests=0,blockers=0,ordinary=0
    for(let seed=0;seed<100;seed++)for(let floor=1;floor<=24;floor++){
      const routes:RouteVote[]=Array.from({length:floor-1},(_,index)=>index+1).filter(index=>index%6!==0).map(index=>({floor:index,alignment:index%2?'dark':'light'}))
      const built=createCampaignFloor(`stage8-audit-${seed}`,floor,routes),again=createCampaignFloor(`stage8-audit-${seed}`,floor,routes)
      expect(built).toEqual(again);expect(built.dungeon.tiles).toHaveLength(64)
      expect(floorContentIssues(built.dungeon,built.content,built.enemyCells)).toEqual([])
      const board={size:8,available:built.dungeon.tiles,blocked:built.dungeon.tiles.filter(tile=>tile.blocksMovement),occupied:built.content.chests.map(chest=>chest.cell)}
      const queue=[built.dungeon.spawn],seen=new Set([cellId(queue[0])])
      for(let i=0;i<queue.length;i++)for(const id of neighborIds(cellId(queue[i]))){const cell=cellFromId(id);if(!seen.has(id)&&canMove(queue[i],cell,board)){seen.add(id);queue.push(cell)}}
      for(const exit of built.content.exits)expect(seen.has(cellId(exit.cell))).toBe(true)
      for(const chest of built.content.chests)expect(neighborIds(cellId(chest.cell)).some(id=>seen.has(id))).toBe(true)
      if(floor%6!==0){ordinary++;chests+=built.content.chests.length;blockers+=built.dungeon.tiles.filter(tile=>tile.column>0&&tile.column<7&&tile.row>0&&tile.row<7&&tile.blocksMovement).length}
      else {expect(built.enemyCells).toEqual([]);expect(built.content.boss?.status).toBe('unimplemented');expect(built.content.boss?.variant).toBe('dark')}
    }
    console.log(JSON.stringify({stage8Floors:2400,ordinary,treasureFloors:chests,interiorBlockingPercent:100*blockers/(ordinary*36)}))
    expect(chests).toBeGreaterThan(1000);expect(chests).toBeLessThan(1700)
  },30000)
  it('isolates cosmetic, layout, starter, placement and reward streams',()=>{
    const seed='isolated-streams',a=generateDungeon(seed,'maze',{obstacles:'obstacles',environment:'environment-a'}),b=generateDungeon(seed,'maze',{obstacles:'obstacles',environment:'environment-b'})
    expect(a.tiles.map(tile=>[tile.blocksMovement,tile.blocksSight,tile.prop])).toEqual(b.tiles.map(tile=>[tile.blocksMovement,tile.blocksSight,tile.prop]))
    expect(a.spawn).toEqual(b.spawn);expect(a.exit).toEqual(b.exit);expect(a.tiles).not.toEqual(b.tiles)
    const deck=createRunDeck(seed),reward=treasureOffer(seed,1,'chest-0')
    createCampaignFloor(seed,1,[],'courtyard');createCampaignFloor(seed,1,[],'maze')
    expect(createRunDeck(seed)).toEqual(deck);expect(treasureOffer(seed,1,'chest-0')).toEqual(reward)
    expect(seedStream(seed,1,'enemy-placement')).not.toBe(seedStream(seed,1,'reward:chest-0'))
  })
  it('contains conservative early rarity offers and three different implemented names',()=>{
    let epic=0
    for(let i=0;i<1000;i++){
      const offer=treasureOffer(`rewards-${i}`,1,'chest-0');expect(new Set(offer.map(card=>card.definitionId)).size).toBe(3)
      expect(offer.every(card=>Object.hasOwn(cards,card.definitionId)&&rarities.includes(card.rarity))).toBe(true)
      epic+=offer.filter(card=>card.rarity==='epic').length
    }
    expect(epic).toBeGreaterThan(0);expect(epic).toBeLessThan(90)
  })
})

describe('continuous route progression',()=>{
  it('walks/fights all 20 regular floors and explicitly skips four unimplemented bosses',()=>{
    usePawnStore.getState().loadDungeon('full-route-test')
    const starter=structuredClone(usePawnStore.getState().deck)
    for(let floor=1;floor<=24;floor++){
      const s=usePawnStore.getState();expect(s.floorNumber).toBe(floor)
      if(floor%6===0){
        expect(s.floorContent?.boss?.variant).toBe('dark');expect(s.enemies).toEqual([])
        expect(s.skipBoss(floorToken(s))).toBe(true)
      }else {
        clearFloor();const current=usePawnStore.getState(),alignment=(floor-1)%6%2===0?'dark':'light'
        walkTo(current.floorContent!.exits.find(exit=>exit.alignment===alignment)!.cell)
        const token=floorToken(usePawnStore.getState());expect(usePawnStore.getState().leaveFloor(token,alignment)).toBe(true)
        expect(usePawnStore.getState().leaveFloor(token,alignment)).toBe(false)
      }
      expect(usePawnStore.getState().deck).toEqual(starter)
    }
    const final=usePawnStore.getState();expect(final.progress).toMatchObject({finished:true,mode:'manual',bossSkips:[6,12,18,24]})
    expect(final.progress?.routes).toHaveLength(20);expect(final.progress?.cleared).toHaveLength(24)
    expect(final.playtestMode).toBe(true);expect(final.transformations.inventory).toEqual([])
    expect(final.skipBoss(floorToken(final))).toBe(false)
  })
  it('rejects remote/busy exits, double commitments and progression during rewards',()=>{
    const s=usePawnStore.getState(),token=floorToken(s)
    expect(s.leaveFloor(token,'light')).toBe(false)
    usePawnStore.setState({enemies:[]});walkTo(usePawnStore.getState().floorContent!.exits[0].cell)
    usePawnStore.getState().submitAction({kind:'wait'});expect(usePawnStore.getState().leaveFloor(token,'light')).toBe(false);finish()
    const turn=usePawnStore.getState().turn;expect(usePawnStore.getState().leaveFloor(token,'light')).toBe(true)
    expect(usePawnStore.getState().turn).toBe(turn);expect(usePawnStore.getState().leaveFloor(token,'dark')).toBe(false)
    expect(usePawnStore.getState().progress?.routes).toEqual([{floor:1,alignment:'light'}])
  })
  it('uses independent per-biome five-vote majorities without a tiebreaker',()=>{
    const routes:RouteVote[]=[1,2,3,4,5,7,8,9,10,11].map(floor=>({floor,alignment:floor<6?(floor<4?'light':'dark'):(floor<10?'dark':'light')}))
    expect(alignmentCounts(routes,6)).toEqual({light:3,dark:2});expect(bossVariant(routes,6)).toBe('light');expect(bossVariant(routes,12)).toBe('dark')
    expect(()=>bossVariant([],6)).toThrow('five route votes')
  })
  it('expires forms once across real exits, then enforces a full Pawn recovery floor',()=>{
    usePawnStore.getState().debugGrant('knight','light');act({kind:'transform',form:'knight',attunement:'light'})
    usePawnStore.setState(s=>({signatures:{...s.signatures,eyeUsed:true,samuraiCharges:2,cooldowns:{...s.signatures.cooldowns,pawn:7}},block:3,blockSources:[{id:'test',name:'Ward',amount:3,windowsLeft:2}],passives:{...s.passives,sharpener:4}}))
    const first=leave();let s=usePawnStore.getState()
    expect(s.transformations.active?.floorsLeft).toBe(1);expect(s.transformations.inventory[0].charges).toBe(4)
    expect(s.signatures.eyeUsed).toBe(false);expect(s.signatures.samuraiCharges).toBe(0);expect(s.block).toBe(0);expect(s.passives.sharpener).toBe(0)
    expect(s.leaveFloor(first,'light')).toBe(false)
    leave();s=usePawnStore.getState();expect(s.transformations.active).toBeNull();expect(s.transformations.recovery).toBe(1)
    expect(s.submitAction({kind:'transform',form:'knight',attunement:'light'})).toBe(false)
    leave();s=usePawnStore.getState();expect(s.transformations.recovery).toBe(0);expect(s.transformations.inventory[0].charges).toBe(4)
    act({kind:'transform',form:'knight',attunement:'light'});expect(usePawnStore.getState().transformations.inventory[0].charges).toBe(3)
  })
  it('keeps manual creation mode across floor changes, saves and development skips',()=>{
    usePawnStore.getState().debugProgress(6,['light','dark','dark','dark','light'])
    let s=usePawnStore.getState();expect(s.floorContent?.boss?.variant).toBe('dark');expect(s.skipBoss(floorToken(s))).toBe(true)
    s=usePawnStore.getState();expect(s.progress?.mode).toBe('manual');expect(s.playtestMode).toBe(true)
    expect(deserializeRun(serializeRun(s)).progress?.mode).toBe('manual')
    usePawnStore.getState().restartRun();expect(usePawnStore.getState().progress?.mode).toBe('random')
    usePawnStore.getState().restartSameSeed();expect(usePawnStore.getState().progress?.mode).toBe('manual')
  })
})

describe('seeded decks and explicit rarities',()=>{
  it('selects exactly eight essentials plus four balanced cards with bounded copies over 100 seeds',()=>{
    const compositions=new Set<string>()
    for(let i=0;i<100;i++){
      const seed=`starter-${i}`,selected=selectStartingCards(seed)
      expect(selected).toHaveLength(12);expect(selected.slice(0,8)).toEqual(coreStarterCards);expect(selectStartingCards(seed)).toEqual(selected)
      for(const id of Object.keys(cards))expect(selected.filter(card=>card===id).length).toBeLessThanOrEqual(starterCopyCap)
      compositions.add([...selected].sort().join(','));expect(createRunDeck(seed).originalStarter).toEqual(selected)
    }
    expect(compositions.size).toBeGreaterThan(15)
  })
  it('uses actual rarity values in rules, descriptions, costs and card faces without new effects',()=>{
    const icons=new Set<string>()
    for(const id of Object.keys(cards) as (keyof typeof cards)[]){
      icons.add(renderToStaticMarkup(<CardIllustration card={id}/>))
      for(const rarity of rarities){
        const definition=cardDefinition({definitionId:id,rarity})
        expect(definition.cost).toBe(cards[id].cost);expect(definition.effect.kind).toBe(cards[id].effect.kind)
        expect(plainCardText(cardPresentationFor({definitionId:id,rarity}).tokens)).toBe(definition.description)
      }
    }
    expect(icons.size).toBe(7)
    for(const rarity of rarities){
      const {game}=createTraining(5),instance={definitionId:'ward' as const,instanceId:'rare-test',rarity}
      const s={...game,deck:{...game.deck,hand:[instance]}}
      expect(resolveTurn(s,{kind:'card',cardInstanceId:instance.instanceId,target:{kind:'self'}})?.block).toBe(cardDefinition(instance).effect.kind==='block'?(cardDefinition(instance).effect as {amount:number}).amount:0)
    }
    usePawnStore.setState(s=>({deck:{...s.deck,hand:[{definitionId:'cut',instanceId:'rare-cut',rarity:'rare'}]}}))
    const markup=renderToStaticMarkup(<CardHand/>);expect(markup).toContain('Rare');expect(markup).toContain('6</strong> damage')
  })
})

describe('one-time treasure and durable interrupted actions',()=>{
  it('keeps explicit targeting ahead of chest/exit interactions and dismisses inspection before opening',()=>{
    const {chest}=chestSetup(),click={stopPropagation:vi.fn()}
    vi.stubGlobal('document',{querySelector:()=>null})
    usePawnStore.setState({selectedCardId:usePawnStore.getState().deck.hand[0].instanceId})
    // Invoke the mesh event boundary; renderer/input layout still needs browser verification.
    const targetClick=click as unknown as Parameters<NonNullable<ReturnType<typeof TreasureChest>['props']['onClick']>>[0]
    TreasureChest({chest}).props.onClick(targetClick);RouteExit({alignment:'light'}).props.onClick(targetClick)
    expect(click.stopPropagation).not.toHaveBeenCalled();expect(usePawnStore.getState().phase).toBe('ready')
    usePawnStore.setState({selectedCardId:undefined});useInspectionStore.setState({characterOpen:true})
    TreasureChest({chest}).props.onClick(targetClick)
    expect(useInspectionStore.getState().characterOpen).toBe(false);expect(usePawnStore.getState().phase).toBe('ready')
    TreasureChest({chest}).props.onClick(targetClick);expect(usePawnStore.getState().phase).toBe('player')
  })
  it('opens once for one world turn/response, then claims once for no turn and puts the card in discard',()=>{
    const {chest,token,action}=chestSetup(),s=usePawnStore.getState(),size=s.deck.hand.length+s.deck.draw.length+s.deck.discard.length
    expect(s.submitAction(action)).toBe(true);let now=usePawnStore.getState(),id=now.actionId
    expect(now.claimTreasure(token,chest.id,0)).toBe(false);expect(now.submitAction(action)).toBe(false)
    now.advancePlayback(id,'player');now.advancePlayback(id,'player');now=usePawnStore.getState();expect(now.turn).toBe(1);expect(now.hp).toBe(10)
    now.advancePlayback(id,'enemies');now=usePawnStore.getState();expect(now.claimTreasure(token,chest.id,0)).toBe(true)
    expect(usePawnStore.getState().claimTreasure(token,chest.id,0)).toBe(false)
    now=usePawnStore.getState();expect(now.turn).toBe(1);expect(now.deck.hand.length+now.deck.draw.length+now.deck.discard.length).toBe(size+1)
    expect(now.deck.discard.at(-1)).toMatchObject(chest.offer[0]);expect(now.submitAction(action)).toBe(false)
    const saved=serializeRun(now);expect(usePawnStore.getState().restoreRunSave(saved)).toBe(true);expect(pendingChest(usePawnStore.getState())).toBeUndefined()
    usePawnStore.getState().resumeRun();expect(usePawnStore.getState().claimTreasure(token,chest.id,0)).toBe(false)
    usePawnStore.getState().restartRun();expect([...usePawnStore.getState().deck.hand,...usePawnStore.getState().deck.draw]).toHaveLength(12)
  })
  it('preserves an opened offer across reload before response, resumes exactly once and supports Skip',()=>{
    const {chest,token,action}=chestSetup();expect(usePawnStore.getState().submitAction(action)).toBe(true)
    const saved=serializeRun(usePawnStore.getState());expect(usePawnStore.getState().restoreRunSave(saved)).toBe(true)
    let s=usePawnStore.getState();expect(s.phase).toBe('player');expect(s.runActive).toBe(false);expect(pendingChest(s)?.offer).toEqual(chest.offer)
    s.resumeRun();finish();s=usePawnStore.getState();expect(s.turn).toBe(1);expect(s.hp).toBe(10)
    expect(s.submitAction({kind:'wait'})).toBe(false);expect(s.leaveFloor(token,'light')).toBe(false)
    const markup=renderToStaticMarkup(<TreasureReward/>);expect(markup).toContain('Choose one card');expect(markup).toContain('Skip all cards');expect(markup.match(/class="reward-card"/g)).toHaveLength(3)
    const count=s.deck.hand.length+s.deck.draw.length+s.deck.discard.length;expect(s.claimTreasure(token,chest.id,null)).toBe(true)
    s=usePawnStore.getState();expect(s.turn).toBe(1);expect(s.deck.hand.length+s.deck.draw.length+s.deck.discard.length).toBe(count)
    expect(s.floorContent?.chests[0].state).toBe('skipped')
  })
  it('rejects remote, diagonal, hidden and stale-floor chest interactions',()=>{
    const {chest,action}=chestSetup(),s=usePawnStore.getState()
    expect(s.submitAction({...action,floorId:'stale'})).toBe(false)
    for(const position of [c(7,7),c(chest.cell.column+1,chest.cell.row+1)]){
      usePawnStore.setState({cell:position});expect(usePawnStore.getState().submitAction(action)).toBe(false)
    }
    usePawnStore.setState({cell:s.cell,visible:new Set([cellId(s.cell)])});expect(usePawnStore.getState().submitAction(action)).toBe(false)
    expect(usePawnStore.getState().turn).toBe(0)
  })
})

describe('versioned run persistence and practice isolation',()=>{
  it('allows moving enemies at an exit or original spawn, while rejecting overlapping live enemies',()=>{
    const s=usePawnStore.getState(),enemy=s.enemies[0],position=neighborIds(cellId(s.cell)).map(cellFromId).find(cell=>s.dungeon.tiles.some(tile=>sameCell(tile,cell)&&!tile.blocksMovement)&&!s.occupied.some(other=>sameCell(other,cell)))!
    usePawnStore.setState({cell:position,from:position})
    for(const cell of [s.dungeon.spawn,s.floorContent!.exits[0].cell]){
      usePawnStore.setState({enemies:[{...enemy,cell,from:cell}]})
      expect(()=>deserializeRun(serializeRun(usePawnStore.getState()))).not.toThrow()
    }
    const moved=usePawnStore.getState().enemies[0];usePawnStore.setState({enemies:[moved,{...moved,id:'duplicate-position'}]})
    expect(()=>deserializeRun(serializeRun(usePawnStore.getState()))).toThrow('occupied enemy')
  })
  it('does not repeat an already-resolved enemy response after reload',()=>{
    const {action}=chestSetup();expect(usePawnStore.getState().submitAction(action)).toBe(true)
    let s=usePawnStore.getState();s.advancePlayback(s.actionId,'player');s=usePawnStore.getState()
    expect(s.phase).toBe('enemies');expect(s.hp).toBe(10)
    expect(s.restoreRunSave(serializeRun(s))).toBe(true);usePawnStore.getState().resumeRun();finish()
    expect(usePawnStore.getState()).toMatchObject({phase:'ready',turn:1,hp:10})
  })
  it('does not tick duration on same-floor vote overrides and resolves the final development floor once',()=>{
    usePawnStore.getState().debugGrant('knight','light');act({kind:'transform',form:'knight',attunement:'light'})
    const active=structuredClone(usePawnStore.getState().transformations)
    expect(usePawnStore.getState().debugProgress(1)).toBe(true)
    expect(usePawnStore.getState().transformations).toEqual(active)
    usePawnStore.getState().debugProgress(24,['dark','dark','dark','light','light'])
    const s=usePawnStore.getState();expect(s.transformations.active?.floorsLeft).toBe(1)
    expect(s.debugProgress(24)).toBe(true);expect(usePawnStore.getState().transformations.active?.floorsLeft).toBe(1)
    const token=floorToken(usePawnStore.getState());expect(usePawnStore.getState().skipBoss(token)).toBe(true)
    expect(usePawnStore.getState().transformations).toMatchObject({active:null,recovery:1})
    expect(usePawnStore.getState().skipBoss(token)).toBe(false)
    expect(()=>deserializeRun(serializeRun(usePawnStore.getState()))).not.toThrow()
  })
  it('round-trips every floor, route, deck, fog, cooldown and transient phase without rerolling',()=>{
    for(const floor of [1,5,6,7,12,18,24]){
      usePawnStore.getState().debugProgress(floor,['dark','light','dark','light','dark'])
      const s=usePawnStore.getState(),saved=serializeRun(s),restored=deserializeRun(saved)
      for(const key of ['dungeon','floorContent','deck','progress','hp','cell','turn','transformations','signatures','visible','explored'] as const)expect(restored[key]).toEqual(s[key])
      expect(restored.runActive).toBe(false)
    }
  })
  it('does not overwrite saved runs during Training or nested tutorials',()=>{
    const memory=new Map<string,string>(),storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value)},removeItem:(key:string)=>memory.delete(key)}
    vi.stubGlobal('localStorage',storage)
    usePawnStore.getState().loadDungeon('storage-isolation');const saved=memory.get(runSaveKey)!
    expect(usePawnStore.getState().enterTraining()).toBe(true);act({kind:'wait'});expect(memory.get(runSaveKey)).toBe(saved)
    expect(usePawnStore.getState().enterTutorial('cards')).toBe(true);act({kind:'wait'});expect(memory.get(runSaveKey)).toBe(saved)
    expect(usePawnStore.getState().exitTutorial()).toBe(true);expect(memory.get(runSaveKey)).toBe(saved)
    expect(usePawnStore.getState().leaveTraining()).toBe(true)
    expect(deserializeRun(memory.get(runSaveKey)!).deck).toEqual(deserializeRun(saved).deck)
  })
  it('preserves corrupt/unsupported saves and supplies an explicit recovery path',()=>{
    const invalid=JSON.stringify({version:999,data:{}}),memory=new Map([[runSaveKey,invalid]])
    const storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value)},removeItem:(key:string)=>memory.delete(key)}
    vi.stubGlobal('localStorage',storage)
    expect(readRunSave(storage).error).toContain('Unsupported save version');expect(memory.get(runSaveKey)).toBe(invalid)
    expect(usePawnStore.getState().restoreRunSave()).toBe(false);expect(usePawnStore.getState().saveError).toBeTruthy()
    usePawnStore.getState().restartRun();expect(memory.get(runSaveKey)).toBe(invalid)
    expect(usePawnStore.getState().discardSavedRun()).toBe(true);expect(memory.has(runSaveKey)).toBe(false)
    usePawnStore.getState().restartRun();expect(memory.has(runSaveKey)).toBe(true)
    const valid=JSON.parse(memory.get(runSaveKey)!)
    for(const mutate of [(data:typeof valid.data)=>{data.deck.hand[0].definitionId='fake'},(data:typeof valid.data)=>{data.progress.mode='unknown'},(data:typeof valid.data)=>{data.visible=[999]},(data:typeof valid.data)=>{data.floorContent.chests=[{id:'bad'}]}]){
      const next=structuredClone(valid);mutate(next.data);expect(()=>deserializeRun(JSON.stringify(next))).toThrow()
    }
  })
  it('keeps new progression information compact and marks unimplemented bosses honestly',()=>{
    let markup=renderToStaticMarkup(<RunHUD/>);expect(markup).toContain('PORTA BARRACKS');expect(markup).toContain('Floor 1/6');expect(markup).toContain('Manual seed')
    usePawnStore.getState().debugProgress(6,['dark','dark','dark','light','light']);markup=renderToStaticMarkup(<RunHUD/>);expect(markup).toContain('Dark 3')
    expect(biomes.map(biome=>biome.identity)).toEqual(['knight','bishop','rook','queen'])
  })
})
