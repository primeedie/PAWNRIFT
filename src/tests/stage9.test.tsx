import { afterEach, describe, expect, it } from 'vitest'
import { enemies, enemyIds, BALANCE_PENDING_USER_DOCUMENT as fixture } from '../data/enemies'
import { createGame, resolveTurn, resolveEnemyPhase, resolvePlayerAction, type GameState } from '../game/logic/combat'
import { createEnemy, currentThreat, planEnemyAttack } from '../game/logic/enemyTactics'
import { trainingArena, createTraining, trainingControl } from '../game/logic/training'
import { cellId, distancesFrom } from '../game/logic/dungeon'
import { createCampaignFloor, floorContentIssues, completedAlignmentHistory, type RouteVote } from '../game/logic/floorContent'
import { advanceCampaign, campaignGame, newCampaign, settleBossDefeat, floorToken } from '../game/logic/run'
import { applyBurn, applyBleed, applyConcussion } from '../game/logic/passives'
import { enemyTestControl } from '../game/logic/enemyTesting'
import { emptyTransformations, grantTransformation, recordTransformationBossWin } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { serializeRun, deserializeRun } from '../game/state/runPersistence'
import { sameCell } from '../game/logic/movement'

const c=(column:number,row:number)=>({column,row}),all=new Set(Array.from({length:64},(_,id)=>id))
const snapshot=usePawnStore.getState()
afterEach(()=>{if(usePawnStore.getState().training)usePawnStore.getState().leaveTraining();usePawnStore.setState(snapshot,true)})
function arena(kind:typeof enemyIds[number]='initiate',at=c(3,2),player=c(3,3)):GameState{
  const game=createGame(trainingArena())
  return {...game,cell:player,enemies:[createEnemy(kind,'soldier',at,'light')],visible:new Set(all),explored:new Set(all),hp:100,maxHp:100}
}
function wait(game:GameState){return resolveTurn(game,{kind:'wait'})!}
function plan(game:GameState,pattern:Parameters<typeof planEnemyAttack>[2]){
  const enemy=game.enemies[0],pending=planEnemyAttack(game,enemy,pattern)
  expect(pending).toBeDefined()
  enemy.tactics={...enemy.tactics!,pending,observed:true};enemy.intent='attack'
  return game
}
const votes=(variant:'light'|'dark'):RouteVote[]=>Array.from({length:5},(_,i)=>({floor:i+1,alignment:variant}))
function bossGame(variant:'light'|'dark'='light'){
  const campaign=newCampaign('boss-stage9','legitimate','random'),progress={...campaign.progress,routes:votes(variant),cleared:[1,2,3,4,5],completedAlignments:completedAlignmentHistory('boss-stage9',[1,2,3,4,5],votes(variant))}
  return {...campaignGame('boss-stage9',6,progress),progress,masterSeed:'boss-stage9',floorNumber:6,playtestMode:false}
}

describe('Porta definitions and deterministic encounters',()=>{
  it('keeps every numeric fixture explicitly pending with no invented HP phase thresholds',()=>{
    for(const id of enemyIds){expect(enemies[id].balance).toBe('BALANCE_PENDING_USER_DOCUMENT');expect(enemies[id].phaseThresholds).toBeNull();expect(enemies[id].stats).toEqual(fixture.stats)}
    expect(enemyIds).toHaveLength(7)
  })
  it('audits 1,000 seeds across six Porta floors for reproducibility, safe spawns and Pawn connectivity',()=>{
    const seen=new Set<string>()
    for(let seed=0;seed<1000;seed++)for(let floor=1;floor<=6;floor++){
      const routes=votes(seed%2?'light':'dark').filter(vote=>vote.floor<floor)
      const built=createCampaignFloor(`porta-${seed}`,floor,routes),again=createCampaignFloor(`porta-${seed}`,floor,routes)
      expect(built).toEqual(again);expect(built.dungeon.tiles).toHaveLength(64)
      expect(floorContentIssues(built.dungeon,built.content,built.enemyCells)).toEqual([])
      const available=new Set(built.dungeon.tiles.filter(tile=>!tile.blocksMovement&&!built.content.chests.some(chest=>sameCell(chest.cell,tile))).map(cellId))
      const reachable=distancesFrom(available,cellId(built.dungeon.spawn))
      for(const cell of built.enemyCells){expect(reachable.get(cellId(cell))).toBeGreaterThanOrEqual(3)}
      expect(new Set(built.enemyCells.map(cellId)).size).toBe(built.enemyCells.length)
      for(const exit of built.content.exits)expect(reachable.has(cellId(exit.cell))).toBe(true)
      built.enemyKinds.forEach(kind=>seen.add(kind))
      const game={...createGame(built.dungeon),floorContent:built.content,occupied:built.content.chests.map(chest=>chest.cell),
        enemies:built.enemyCells.map((cell,index)=>createEnemy(built.enemyKinds[index],`audit-${index}`,cell,built.content.alignment))}
      expect(game.enemies.every(enemy=>enemy.variant===built.content.alignment&&!enemy.tactics?.pending)).toBe(true)
      expect(wait(game).events.some(event=>event.kind==='hit'&&event.targetId==='pawn')).toBe(false)
    }
    expect([...seen].sort()).toEqual([...enemyIds].sort())
  },120000)
})

describe('one-response tactical AI and shared threat geometry',()=>{
  it('winds up, resolves once, recovers; invalid actions do nothing and inputs remain immutable',()=>{
    const game=arena(),before=structuredClone(game),wound=wait(game)
    expect(game).toEqual(before);expect(wound.turn).toBe(1);expect(wound.hp).toBe(100)
    expect(wound.enemies[0].tactics?.pending?.pattern).toBe('cut')
    expect(resolvePlayerAction(wound,{kind:'move',destination:c(-1,3)})).toBeNull()
    const hit=wait(wound);expect(hit.hp).toBe(98);expect(hit.turn).toBe(2)
    expect(hit.events.filter(event=>event.actor==='soldier'&&event.kind==='hit')).toHaveLength(1)
    const recovery=wait(hit);expect(recovery.hp).toBe(98);expect(recovery.enemies[0].tactics?.recovery).toBe(0)
    expect(recovery.enemies[0].tactics?.pending).toBeUndefined()
  })
  it.each(['thrust','shot','charge','lunge'] as const)('%s warns the same cells it can hit, then misses a dodged committed target',pattern=>{
    const kind=pattern==='shot'?'sentinel':pattern==='lunge'?'chimera-knight':pattern==='charge'?'cavalier':'halberdier'
    let game=plan(arena(kind,c(3,1),c(3,3)),pattern)
    const cells=currentThreat(game,game.enemies[0]);expect(cells).toContainEqual(c(3,3))
    const hit=resolveEnemyPhase(game);expect(hit.hp).toBe(98)
    game={...game,cell:c(4,3)}
    const miss=resolveEnemyPhase(game);expect(miss.hp).toBe(100)
    expect(miss.enemies[0].tactics?.pending).toBeUndefined()
    expect(miss.enemies[0].cell).not.toEqual(game.cell)
  })
  it('cover, occupied lanes, void and changed terrain invalidate threats without retargeting',()=>{
    const game=arena('sentinel',c(3,0),c(3,3))
    game.occupied=[c(3,2)];expect(planEnemyAttack(game,game.enemies[0],'shot')).toBeUndefined()
    game.occupied=[];plan(game,'shot')
    game.dungeon={...game.dungeon,tiles:game.dungeon.tiles.map(tile=>sameCell(tile,c(3,2))?{...tile,blocksSight:true,blocksMovement:true,prop:'wall'}:tile)}
    expect(currentThreat(game,game.enemies[0])).not.toContainEqual(game.cell)
    expect(resolveEnemyPhase(game).hp).toBe(100)
    game.dungeon={...game.dungeon,tiles:game.dungeon.tiles.filter(tile=>!sameCell(tile,c(3,2)))}
    expect(planEnemyAttack(game,game.enemies[0],'shot')).toBeUndefined()
  })
  it('repositions reach/ranged troops, follows last seen cells, and never overlaps another actor',()=>{
    for(const kind of ['initiate','halberdier','sentinel','cavalier'] as const){
      let game=arena(kind,c(1,1),c(3,3));game.enemies.push(createEnemy('shield-guard','other',c(2,1),'dark'))
      for(let i=0;i<12;i++){
        const again=wait(structuredClone(game)),next=wait(game);expect(next).toEqual(again)
        expect(new Set(next.enemies.filter(e=>e.hp>0).map(e=>cellId(e.cell))).size).toBe(next.enemies.filter(e=>e.hp>0).length)
        expect(next.enemies.some(e=>e.hp>0&&sameCell(e.cell,next.cell))).toBe(false)
        expect(next.enemies.every(e=>next.dungeon.tiles.some(tile=>sameCell(tile,e.cell)&&!tile.blocksMovement))).toBe(true)
        game={...next,visible:new Set(all),explored:new Set(all)}
      }
    }
  })
  it('lets a threatened Sentinel spend its single response retreating instead of moving and firing together',()=>{
    const game=arena('sentinel'),next=wait(game),actor=next.enemies[0]
    expect(actor.cell).not.toEqual(game.enemies[0].cell)
    expect(actor.tactics?.pending).toBeUndefined();expect(next.hp).toBe(100)
    expect(next.events.filter(event=>event.actor==='soldier').map(event=>event.kind)).toEqual(['move'])
  })
  it('runs a real ranged wind-up/shot across full-sight Training without expanding ordinary fog',()=>{
    let game=createTraining(7).game
    game={...game,enemies:[createEnemy('sentinel','ranged',c(3,0),'dark')]}
    game=wait(game);expect(game.enemies[0].tactics?.pending?.pattern).toBe('shot');expect(game.hp).toBe(12)
    game=wait(game);expect(game.hp).toBe(10);expect(game.turn).toBe(2)
    const normal=arena('sentinel',c(3,0),c(3,3));normal.visible=new Set([cellId(normal.cell)])
    expect(wait(normal).enemies[0].tactics?.pending).toBeUndefined()
  })
  it('does not damage on first visibility, through hidden plans, or after death',()=>{
    let game=plan(arena(),'cut');game.enemies[0].tactics!.observed=false
    expect(resolveEnemyPhase(game).hp).toBe(100)
    game=plan(arena(),'cut');game.visible=new Set([cellId(game.cell)])
    expect(resolveEnemyPhase(game).hp).toBe(100)
    game=plan(arena(),'cut');game.enemies[0].hp=0
    expect(resolveEnemyPhase(game).hp).toBe(100)
  })
  it('uses finite guard pools; phase switches clear incompatible plans and provide an opening',()=>{
    let game=resolveEnemyPhase(plan(arena('shield-guard'),'command'))
    expect(game.enemies[0].block).toBe(fixture.guard.amount)
    game=resolveEnemyPhase(game);game=resolveEnemyPhase(game)
    expect(game.enemies[0].block).toBe(0)
    const boss=plan(arena('hallowed-commander'),'thrust')
    const changed=enemyTestControl(boss,{kind:'phase',id:'soldier',phase:1})!
    expect(changed.enemies[0].tactics).toMatchObject({phase:1,recovery:1,pending:undefined})
    expect(wait(changed).hp).toBe(100)
  })
  it('integrates Burn, independent Bleed, Concussion immunity, fear and auto-parries',()=>{
    let game=plan(arena('chimera-knight'),'twin-strike'),enemy=game.enemies[0]
    enemy.hp=enemy.maxHp=100;applyBurn(enemy,-1);applyBleed(enemy,-1);applyBleed(enemy,0);applyConcussion(enemy)
    game.signatures.samuraiCharges=3
    game=wait(game)
    expect(game.hp).toBe(100);expect(game.signatures.samuraiCharges).toBe(2)
    expect(game.enemies[0].hp).toBeLessThan(100);expect(game.enemies[0].bleed).toHaveLength(2)
    enemy=game.enemies[0];enemy.concussion=0;enemy.tactics!.pending=planEnemyAttack(game,enemy,'twin-strike');enemy.tactics!.observed=true
    game=wait(game);expect(game.enemies[0].stunned).toBe(true);expect(game.enemies[0].tactics?.pending).toBeUndefined()
    expect(game.enemies[0].stunImmunity).toBeGreaterThan(0)
    let feared=plan(arena(),'cut');feared.enemies[0].fearTurns=1;feared=wait(feared)
    expect(feared.hp).toBe(100);expect(feared.enemies[0].tactics?.pending).toBeUndefined()
  })
})

describe('boss victory, progression, saves and isolated Training',()=>{
  it.each(['light','dark'] as const)('%s boss defeat records once, rewards existing Knight lifecycle and unlocks Astra',variant=>{
    let game=bossGame(variant)
    const boss=game.enemies[0]
    game={...game,cell:c(4,4),visible:new Set(all),explored:new Set(all)}
    let resolved=resolveTurn(game,{kind:'attack',targetId:boss.id})!
    resolved=resolveTurn(resolved,{kind:'attack',targetId:boss.id})!
    expect(resolved.enemies[0].hp).toBe(0)
    const clear=settleBossDefeat({...game,...resolved})
    expect(clear.floorContent?.boss).toMatchObject({status:'defeated',rewardResolved:true,rewardGranted:true})
    expect(clear.progress?.bossClears).toEqual([{floor:6,variant,eligible:true}])
    expect(clear.transformations.inventory).toMatchObject([{form:'knight',charges:5,attunements:[variant]}])
    expect(settleBossDefeat(clear)).toBe(clear)
    const exiting={...clear,cell:clear.floorContent!.exits[0].cell,visible:new Set(all)}
    const next=advanceCampaign(exiting,floorToken(exiting),variant)!
    expect(next).toMatchObject({floorNumber:7,floorContent:{biome:'astra'}})
    expect(next.progress.bossSkips).toEqual([]);expect(next.progress.routes).toHaveLength(5)
    expect(advanceCampaign({...exiting,progress:next.progress},floorToken(exiting),variant)).toBeNull()
    expect(wait(clear).events.some(event=>event.actor===boss.id&&event.kind==='hit')).toBe(false)
  })
  it('development clears/skips/manual runs and Training never award legitimate progression',()=>{
    for(const modified of [true,false]){
      const game=bossGame();game.playtestMode=modified;if(!modified)game.progress.mode='manual'
      game.enemies[0].hp=0
      const clear=settleBossDefeat(game);expect(clear.transformations.inventory).toEqual([])
      expect(clear.progress?.bossClears?.[0].eligible).toBe(false)
    }
    const game=bossGame();expect(settleBossDefeat({...game,enemies:[]}).floorContent?.boss?.status).toBe('active')
    expect(advanceCampaign(game,floorToken(game),'light')).toBeNull()
    const skip=advanceCampaign(game,floorToken(game),undefined,true)!
    expect(skip.progress.bossSkips).toEqual([6]);expect(skip.progress.bossClears).toBeUndefined()
    expect(skip.transformations.inventory).toEqual([])
    const training={...game,mode:'training' as const};training.enemies[0].hp=0
    expect(settleBossDefeat(training)).toBe(training)
  })
  it('preserves shared charges and the two-win destruction/reconstruction path',()=>{
    const owned=grantTransformation(emptyTransformations(),'knight','light')!;owned.inventory[0].charges=2
    expect(recordTransformationBossWin(owned,'knight','dark').inventory[0]).toMatchObject({charges:2,attunements:['light','dark']})
    const destroyed={...emptyTransformations(),reconstruction:{knight:0 as const}}
    const first=recordTransformationBossWin(destroyed,'knight','light');expect(first.inventory).toEqual([])
    expect(recordTransformationBossWin(first,'knight','dark').inventory[0].charges).toBe(5)
    const full=grantTransformation(grantTransformation(emptyTransformations(),'bishop','light')!,'rook','dark')!
    const ready=recordTransformationBossWin(full,'knight','light')
    expect(ready.inventory).toEqual(full.inventory);expect(ready.reconstruction.knight).toBe(2)
  })
  it('settles a real store boss kill once, persists it and cannot replay its pending response on Resume',()=>{
    usePawnStore.getState().loadDungeon('boss-stage9',undefined,'random')
    const built=bossGame('dark'),s=usePawnStore.getState()
    usePawnStore.setState({...built,deck:s.deck,cell:c(4,4),from:c(4,4),visible:new Set(all),explored:new Set(all),runActive:true,phase:'ready'})
    const attack=()=>{
      const state=usePawnStore.getState();expect(state.submitAction({kind:'attack',targetId:state.enemies[0].id})).toBe(true)
      const id=usePawnStore.getState().actionId;state.advancePlayback(id,'player');state.advancePlayback(id,'player');state.advancePlayback(id,'enemies')
    }
    attack();attack()
    let now=usePawnStore.getState();expect(now.floorContent?.boss?.status).toBe('defeated');expect(now.turn).toBe(2)
    const raw=serializeRun(now),restored=deserializeRun(raw)
    expect(restored.progress?.bossClears).toEqual([{floor:6,variant:'dark',eligible:true}])
    expect(restored.transformations?.inventory[0]).toMatchObject({form:'knight',charges:5})
    expect(now.restoreRunSave(raw)).toBe(true);usePawnStore.getState().resumeRun();now=usePawnStore.getState()
    now.advancePlayback(now.actionId,'enemies');expect(usePawnStore.getState().turn).toBe(2)
    expect(usePawnStore.getState().progress?.bossClears).toHaveLength(1)
  })
  it('saves pending tactical plans, guard windows and resolved boss clears without replaying responses',()=>{
    usePawnStore.getState().loadDungeon('stage9-save')
    const s=usePawnStore.getState(),enemy=createEnemy('sentinel','saved',c(3,1),'dark')
    const game=arena('sentinel',c(3,1),c(3,3));game.enemies=[enemy];plan(game,'shot')
    // Preserve valid campaign map/content while inserting a real plan on free terrain.
    const cell=s.enemies[0].cell,actor=createEnemy('shield-guard','saved',cell,s.floorContent!.alignment)
    actor.tactics!.pending=planEnemyAttack(s,actor,'command');actor.tactics!.observed=true
    usePawnStore.setState({enemies:[actor]})
    const restored=deserializeRun(serializeRun(usePawnStore.getState()))
    expect(restored.enemies).toEqual([actor]);expect(restored.runActive).toBe(false)
    expect(restored.phase).toBe('ready')
    const raw=JSON.parse(serializeRun(usePawnStore.getState()));raw.data.enemies[0].tactics.pending.path=[c(-1,3)]
    expect(()=>deserializeRun(JSON.stringify(raw))).toThrow('Invalid enemy tactics')
  })
  it('resumes a saved roster strike exactly once, and preserves an already resolved enemy phase',()=>{
    usePawnStore.getState().loadDungeon('roster-pending-save')
    let s=usePawnStore.getState()
    const at=s.dungeon.tiles.find(tile=>!tile.blocksMovement&&Math.abs(tile.column-s.cell.column)+Math.abs(tile.row-s.cell.row)===1&&!s.occupied.some(cell=>sameCell(cell,tile)))!
    const actor=createEnemy('initiate','saved-strike',at,s.floorContent!.alignment)
    actor.tactics!.pending=planEnemyAttack(s,actor,'cut');actor.tactics!.observed=true;actor.intent='attack'
    usePawnStore.setState({enemies:[actor]});s=usePawnStore.getState()
    expect(s.submitAction({kind:'wait'})).toBe(true)
    const raw=serializeRun(usePawnStore.getState())
    expect(usePawnStore.getState().restoreRunSave(raw)).toBe(true);usePawnStore.getState().resumeRun();s=usePawnStore.getState()
    const id=s.actionId;s.advancePlayback(id,'player');s.advancePlayback(id,'player')
    s=usePawnStore.getState();expect(s.turn).toBe(1);expect(s.hp).toBe(10)
    const resolved=serializeRun(s);expect(s.restoreRunSave(resolved)).toBe(true);usePawnStore.getState().resumeRun();s=usePawnStore.getState()
    s.advancePlayback(s.actionId,'enemies');expect(usePawnStore.getState().turn).toBe(1);expect(usePawnStore.getState().hp).toBe(10)
    const legacy=JSON.parse(raw);legacy.version=2;legacy.data.enemies=legacy.data.enemies.map((enemy:Record<string,unknown>)=>({...enemy,kind:'rookling',tactics:undefined}))
    expect(deserializeRun(JSON.stringify(legacy)).dungeon).toEqual(s.dungeon)
  })
  it('exercises public Training summon/reset/phase/status controls using real models/AI, restores the run exactly',()=>{
    const store=usePawnStore.getState();store.loadDungeon('isolated-stage9')
    const before=serializeRun(usePawnStore.getState());expect(usePawnStore.getState().enterTraining()).toBe(true)
    for(const archetype of enemyIds){
      let s=usePawnStore.getState();expect(s.train({kind:'enemy-control',command:{kind:'clear'}})).toBe(true)
      expect(s.train({kind:'enemy-control',command:{kind:'spawn',archetype,variant:'dark',passive:true}})).toBe(true)
      s=usePawnStore.getState();const actor=s.enemies[0];expect(actor.kind).toBe(archetype)
      expect(s.train({kind:'enemy-control',command:{kind:'passive',id:actor.id,value:false}})).toBe(true)
      expect(s.train({kind:'enemy-control',command:{kind:'status',id:actor.id,status:'burn'}})).toBe(true)
      if(actor.boss)expect(s.train({kind:'enemy-control',command:{kind:'phase',id:actor.id,phase:1}})).toBe(true)
      expect(s.submitAction({kind:'wait'})).toBe(true);let id=usePawnStore.getState().actionId
      s.advancePlayback(id,'player');const turn=usePawnStore.getState().turn;s.advancePlayback(id,'player');expect(usePawnStore.getState().turn).toBe(turn)
      s.advancePlayback(id,'enemies');expect(usePawnStore.getState().train({kind:'roster-reset'})).toBe(true)
    }
    expect(usePawnStore.getState().leaveTraining()).toBe(true)
    expect(serializeRun(usePawnStore.getState())).toBe(before)
    const isolated=createTraining(1);expect(trainingControl(isolated.game,isolated.session,{kind:'enemy-control',command:{kind:'clear'}})?.game.mode).toBe('training')
  })
})
