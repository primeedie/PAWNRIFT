import { Children,isValidElement,type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe,expect,it } from 'vitest'
import { createTraining,defaultDummy,trainingControl,type DummySpec } from '../game/logic/training'
import { resolvePlayerAction,resolveEnemyPhase,resolveTurn,type GameState } from '../game/logic/combat'
import { abilityReason } from '../game/logic/signatures'
import { defendIncoming,type IncomingAttack } from '../game/logic/playerDefense'
import { grantTransformation } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { signatureInfo } from '../ui/inspectionPresentation'
import { characterPose,enemyPresentationDuration,parryPresentation } from '../utils/characterAnimation'
import { armLengths,createArmSolver,handPose } from '../utils/characterRig'
import { characterDesigns } from '../data/characterDesigns'
import { Weapon } from '../scenes/components/CharacterEquipment'
import { Vector3 } from 'three'
import { AttackGuide } from '../ui/AttackGuide'

const cells=[{column:4,row:3},{column:3,row:4},{column:2,row:3},{column:3,row:2}]
const specs=(count:number,pattern:DummySpec['pattern']='melee')=>cells.slice(0,count).map((cell,i)=>({...defaultDummy(i,cell),behavior:'sparring' as const,pattern}))
const game=(count=0,pattern:DummySpec['pattern']='melee')=>createTraining(1,'open',specs(count,pattern)).game
const cast=(state:GameState)=>resolveTurn(state,{kind:'ability'})!
const wait=(state:GameState)=>resolveTurn(state,{kind:'wait'})!

describe('Crimson Reversal Samurai Mode',()=>{
  it('activates immediately with three charges for one turn, no Energy, and ten subsequent cooldown ticks',()=>{
    const original={...game(),energy:0},before=structuredClone(original),player=resolvePlayerAction(original,{kind:'ability'})!
    expect(player.signatures.samuraiCharges).toBe(3);expect(player.energy).toBe(0)
    let state=resolveEnemyPhase(player)
    expect(state.turn).toBe(1);expect(state.signatures.cooldowns.pawn).toBe(10)
    for(let tick=9;tick>=0;tick--){state=wait(state);expect(state.signatures.cooldowns.pawn).toBe(tick);expect(state.signatures.samuraiCharges).toBe(3)}
    expect(abilityReason(state)).toContain('already active')
    expect(resolveTurn(state,{kind:'ability'})).toBeNull()
    expect(signatureInfo(state).status).toBe('SAMURAI MODE 3/3')
    expect(original).toEqual(before)
  })
  it.each([1,2,3,4])('parries up to three of %i attacks in one response, never attacks or duplicates damage',count=>{
    const before=game(count),state=cast(before),parries=state.events.filter(e=>e.parryKind==='samurai')
    expect(parries).toHaveLength(Math.min(count,3))
    expect(parries.map(e=>e.parriesLeft)).toEqual([2,1,0].slice(0,count))
    expect(state.hp).toBe(before.hp-(count===4?2:0));expect(state.turn).toBe(1)
    expect(state.enemies.map(e=>e.hp)).toEqual(before.enemies.map(e=>e.hp))
    expect(state.events.filter(e=>e.kind==='counter')).toHaveLength(0)
    expect(state.signatures.samuraiCharges).toBe(Math.max(0,3-count))
    expect(state.signatures.cooldowns.pawn).toBe(10)
    expect(signatureInfo(state).status).toBe(count>=3?'10 turns left':`SAMURAI MODE ${3-count}/3`)
  })
  it('persists across actions, permits normal Sharpener basics, then exposes the next strike after depletion',()=>{
    let state=cast(game())
    state={...state,enemies:game(1).enemies}
    for(let hit=1;hit<=3;hit++){
      state=resolveTurn(state,{kind:'attack',targetId:'dummy-1'})!
      expect(state.signatures.samuraiCharges).toBe(3-hit)
      expect(state.passives.sharpener).toBe(hit)
      expect(state.hp).toBe(12)
      expect(state.events.filter(e=>e.kind==='counter')).toHaveLength(0)
    }
    const exposed=wait(state);expect(exposed.hp).toBe(10);expect(exposed.passives.sharpener).toBe(3)
    expect(resolveTurn(exposed,{kind:'ability'})).toBeNull()
  })
  it.each(['projectile','unparryable','unblockable','dot','environment'] as const)('%s uses the same classified mitigation path',pattern=>{
    const state=cast(game(1,pattern)),protectedHit=pattern==='projectile'
    expect(state.hp).toBe(protectedHit?12:10)
    expect(state.signatures.samuraiCharges).toBe(protectedHit?2:3)
    expect(state.events.filter(e=>e.parryKind==='samurai')).toHaveLength(protectedHit?1:0)
  })
  it('excludes DoT/environment/unblockable/unparryable attacks and gives auto-parry priority over manual',()=>{
    const options={raw:5,hp:12,block:2,guard:2,poise:1,charges:3,manual:true}
    for(const attack of [{kind:'dot'},{kind:'environment'},{kind:'melee',unblockable:true},{kind:'projectile',parryable:false}] satisfies IncomingAttack[]){
      const result=defendIncoming(attack,options)
      expect(result.parried).toBe(false);expect(result.charges).toBe(3)
      if(attack.kind==='dot'||attack.kind==='environment'||attack.unblockable)expect(result.damage).toBe(5)
    }
    expect(defendIncoming({kind:'melee'},options)).toMatchObject({automatic:true,manual:false,damage:0,blocked:0,charges:2})
    expect(defendIncoming({kind:'melee'},{...options,charges:0})).toMatchObject({automatic:false,manual:true,damage:0})
    expect(defendIncoming({kind:'melee'},{...options,charges:99}).charges).toBe(2)
  })
  it('preserves ordinary Defend and explicitly prepared Riposte, with no automatic counter or Sharpener gain',()=>{
    const base=game(1),defended=resolveTurn(base,{kind:'defend'})!
    expect(defended.events.filter(e=>e.kind==='counter')).toHaveLength(1)
    const active=cast(game()),cards=[...active.deck.hand,...active.deck.draw],card=cards.find(c=>c.definitionId==='riposte')!
    const ready={...active,enemies:base.enemies,passives:{...active.passives,sharpener:4},deck:{...active.deck,hand:[card],draw:cards.filter(c=>c!==card)}}
    const next=resolveTurn(ready,{kind:'card',cardInstanceId:card.instanceId,target:{kind:'self'}})!
    expect(next.events.filter(e=>e.kind==='counter').map(e=>e.amount)).toEqual([4])
    expect(next.events.filter(e=>e.parryKind==='samurai')).toHaveLength(1)
    expect(next.passives.sharpener).toBe(4);expect(next.turn).toBe(2)
  })
  it('clears on transformation/death/floor change while preserving cooldown and isolates free training resets',()=>{
    const active=cast(game()),training=createTraining(1)
    const knight=resolveTurn({...active,transformations:grantTransformation(active.transformations,'knight','light')!},{kind:'transform',form:'knight',attunement:'light'})!
    expect(knight.signatures.samuraiCharges).toBe(0);expect(knight.signatures.cooldowns.pawn).toBe(9)
    const dead=resolveEnemyPhase({...active,hp:0})
    expect(dead.signatures.samuraiCharges).toBe(0);expect(resolveEnemyPhase(dead)).toBe(dead)
    const reset=trainingControl(active,training.session,{kind:'samurai-reset'})!
    expect(reset.game.signatures).toMatchObject({samuraiCharges:0,cooldowns:{pawn:10}})
    expect(reset.game.turn).toBe(active.turn)
    expect(trainingControl(active,training.session,{kind:'restore',resource:'cooldowns'})!.game.signatures).toMatchObject({samuraiCharges:3,cooldowns:{pawn:0}})
    expect(trainingControl({...active,mode:'run'},training.session,{kind:'samurai-reset'})).toBeNull()
    const original=usePawnStore.getState()
    try{
      usePawnStore.setState({...active,mode:'run',training:null,runActive:true,phase:'ready'})
      expect(usePawnStore.getState().regenerateFloor('same-floor-amendment')).toBe(true)
      expect(usePawnStore.getState().signatures.samuraiCharges).toBe(3)
      expect(usePawnStore.getState().transitionFloor('next-floor-amendment',true)).toBe(true)
      expect(usePawnStore.getState().signatures).toMatchObject({samuraiCharges:0,cooldowns:{pawn:10}})
      expect(usePawnStore.getState().enterTraining()).toBe(true)
      expect(usePawnStore.getState().tryAbility()).toBe(true)
      let s=usePawnStore.getState();s.advancePlayback(s.actionId,'player');s.advancePlayback(s.actionId,'enemies')
      expect(usePawnStore.getState().leaveTraining()).toBe(true)
      expect(usePawnStore.getState().signatures).toMatchObject({samuraiCharges:0,cooldowns:{pawn:10}})
      const token=usePawnStore.getState().actionId
      usePawnStore.setState({hp:0,phase:'player',signatures:{...active.signatures}})
      usePawnStore.getState().advancePlayback(token,'player')
      expect(usePawnStore.getState().signatures.samuraiCharges).toBe(0)
    }finally{usePawnStore.setState(original,true)}
  })
  it('queues bounded blade parries with stable resolved IDs and no frame-driven rules',()=>{
    const state=cast(game(3)),before=structuredClone(state),parries=state.events.filter(e=>e.parryKind==='samurai')
    expect(parries.map(e=>e.delayMs)).toEqual([0,100,200]);expect(enemyPresentationDuration(state)).toBe(300)
    for(let time=0;time<300;time++){
      const cue=parryPresentation(state,time)!
      expect(cue.sourceId).toBe(parries[Math.floor(time/100)].sourceId)
      characterPose('pawn','parry',cue.progress)
    }
    expect(parryPresentation(state,300)).toBeUndefined();expect(state).toEqual(before)
  })
})

function parts(node:ReactNode):{shape?:string;size?:readonly number[];name?:string}[]{
  return Children.toArray(node).flatMap(child=>isValidElement<{children?:ReactNode;shape?:string;size?:readonly number[];name?:string}>(child)?[child.props,...parts(child.props.children)]:[])
}
describe('attunement equipment and presentation',()=>{
  it('authors separate lance/spear and keeps Light claws while Dark Queen has no hand weapon',()=>{
    const lance=parts(Weapon({form:'knight',variant:'light'})),spear=parts(Weapon({form:'knight',variant:'dark'}))
    expect(lance.some(p=>p.shape==='cone'&&p.size?.[0]===0.15)).toBe(true)
    expect(spear.some(p=>p.shape==='leaf')).toBe(true);expect(spear.some(p=>p.shape==='cone'&&(p.size?.[0]??0)>0.05)).toBe(false)
    const claws=parts(Weapon({form:'queen',variant:'light'})),knuckles=parts(Weapon({form:'queen',variant:'dark'}))
    expect(claws.filter(p=>p.shape==='claw')).toHaveLength(6)
    expect(knuckles.some(p=>p.shape==='claw')).toBe(false)
    expect(knuckles).toEqual([])
    expect(renderToStaticMarkup(<AttackGuide form="bishop"/>)).toContain('straight 2, diagonal 1')
  })
  it('uses distinct attunement stances/strokes while keeping all grips reachable and limb lengths fixed',()=>{
    const solve=createArmSolver()
    for(const form of ['knight','queen'] as const)for(const cue of ['idle','attack','signature'] as const){
      const light=characterPose(form,cue,0.35,false,'light'),dark=characterPose(form,cue,0.35,false,'dark')
      expect(handPose(form,light,1,'light')).not.toEqual(handPose(form,dark,1,'dark'))
      for(const variant of ['light','dark'] as const)for(let i=0;i<=50;i++)for(const side of [-1,1] as const){
        const p=characterPose(form,cue,i/50,false,variant),socket=handPose(form,p,side,variant),shoulder=new Vector3(side*characterDesigns[form].shoulder,0.81,0),joints=solve(shoulder,socket.position,socket.rotation,side)
        expect(joints.wrist.distanceTo(new Vector3(...socket.position))).toBeLessThan(0.012)
        expect(joints.wrist.distanceTo(joints.elbow)).toBeCloseTo(armLengths.forearm)
      }
    }
  })
})
