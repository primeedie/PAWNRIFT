import { Children,createRef,isValidElement,type ReactNode } from 'react'
import { describe,expect,it } from 'vitest'
import { Euler,Group,Vector3 } from 'three'
import { createTraining,defaultDummy,trainingControl } from '../game/logic/training'
import { resolvePlayerAction,resolveEnemyPhase,resolveTurn,type GameState } from '../game/logic/combat'
import { blockPools,blockTotal,blockWindowLabel,grantBlock,spendBlock,tickBlock } from '../game/logic/protection'
import { usePawnStore } from '../game/state/pawnStore'
import { handEquipment,equipmentByForm } from '../data/attunementAppearance'
import { Weapon } from '../scenes/components/CharacterEquipment'
import { CorruptionArmor } from '../scenes/components/CorruptionArmor'
import { Head } from '../scenes/components/ChessHead'
import { geometry } from '../scenes/components/CharacterParts'
import { characterPose } from '../utils/characterAnimation'
import { characterDesigns,characterTiming } from '../data/characterDesigns'
import { createArmSolver,handPose } from '../utils/characterRig'

const cell=(column:number,row:number)=>({column,row})
const wait=(state:GameState)=>resolveTurn(state,{kind:'wait'})!
function setup(form:'pawn'|'rook'='pawn',variant:'light'|'dark'='light'){
  const fresh=createTraining(1,'open',[])
  return trainingControl(fresh.game,fresh.session,{kind:'form',form,attunement:variant})!.game
}
function withCard(state:GameState,id:'ward'|'riposte'|'slip',index=0){
  const all=[...state.deck.hand,...state.deck.draw,...state.deck.discard],instance=all.filter(card=>card.definitionId===id)[index]!
  return {state:{...state,energy:3,deck:{...state.deck,hand:[instance],draw:all.filter(card=>card.instanceId!==instance.instanceId),discard:[]}},instance}
}
function play(state:GameState,id:'ward'|'riposte'|'slip',index=0,playerOnly=false){
  const ready=withCard(state,id,index),action={kind:'card' as const,cardInstanceId:ready.instance.instanceId,target:id==='slip'?{kind:'tile' as const,cell:cell(4,3)}:{kind:'self' as const}}
  return (playerOnly?resolvePlayerAction:resolveTurn)(ready.state,action)!
}
function sparring(state:GameState,count=1){
  const fresh=createTraining(2,'open',[cell(4,3),cell(3,4)].slice(0,count).map((at,i)=>({...defaultDummy(i,at),behavior:'sparring' as const,pattern:'melee' as const})))
  return {...state,enemies:fresh.game.enemies}
}
describe('source-specific defensive response windows',()=>{
  it('normal Defend guards and counters only the immediate response',()=>{
    const before=sparring(setup()),first=resolveTurn(before,{kind:'defend'})!
    expect(first.hp).toBe(12);expect(first.guarding).toBe(false)
    expect(first.events.filter(e=>e.kind==='counter')).toHaveLength(1)
    const second=wait(first)
    expect(second.hp).toBe(10);expect(second.events.filter(e=>e.kind==='counter')).toHaveLength(0)
    expect(second.turn).toBe(2)
  })
  it.each(['ward','riposte','slip'] as const)('%s Block lasts exactly two real responses while card counter remains immediate',id=>{
    const first=play(setup(),id),amount=id==='ward'?3:1
    expect(first.block).toBe(amount);expect(first.blockSources).toMatchObject([{windowsLeft:1,amount}])
    expect(first.preparedCounter).toBe(0);expect(first.turn).toBe(1)
    expect(blockWindowLabel(first)).toBe('1 response left')
    const second=wait(first)
    expect(second.block).toBe(0);expect(second.blockSources).toEqual([]);expect(second.turn).toBe(2)
  })
  it('absorbs immediate damage, retains a partially spent pool for window two, then depletes immediately',()=>{
    const first=play(sparring(setup()),'ward')
    expect(first.block).toBe(1);expect(first.hp).toBe(12)
    const second=wait(first)
    expect(second.block).toBe(0);expect(second.blockSources).toEqual([]);expect(second.hp).toBe(11)
    expect(second.events.find(e=>e.targetId==='pawn'&&e.kind==='hit')).toMatchObject({blocked:1,amount:1})
    const double=play(sparring(setup(),2),'ward')
    expect(double.events.filter(e=>e.targetId==='pawn'&&e.kind==='hit').map(e=>e.blocked)).toEqual([2,1])
    expect(double.blockSources).toEqual([])
  })
  it.each(['light','dark'] as const)('Bastion %s Block lasts three windows; retaliation is available only in first two',variant=>{
    const first=resolveTurn(setup('rook',variant),{kind:'ability'})!,amount=variant==='light'?4:8
    expect(first.block).toBe(amount);expect(first.blockSources[0].windowsLeft).toBe(2)
    expect(first.fortified?.windowsLeft).toBe(1)
    const second=wait(first)
    expect(second.block).toBe(amount);expect(second.blockSources[0].windowsLeft).toBe(1);expect(second.fortified).toBeUndefined()
    const third=wait(sparring(second))
    expect(third.hp).toBe(12);expect(third.block).toBe(0);expect(third.fortified).toBeUndefined()
    expect(third.events.filter(e=>e.kind==='counter')).toHaveLength(0)
    const fourth=wait(third);expect(fourth.hp).toBe(10)
  })
  it.each(['light','dark'] as const)('Bastion %s retaliates once on window two and never re-arms',variant=>{
    const first=resolveTurn(setup('rook',variant),{kind:'ability'})!
    const second=wait(sparring(first,2)),damage=variant==='light'?5:2
    expect(second.events.filter(e=>e.kind==='counter').map(e=>e.amount)).toEqual([damage])
    expect(second.fortified).toBeUndefined()
    expect(wait(second).events.filter(e=>e.kind==='counter')).toHaveLength(0)
    expect(wait(wait(second)).events.filter(e=>e.kind==='counter')).toHaveLength(0)
  })
  it('new sources never renew old expiry and same-source replacement cannot stack indefinitely',()=>{
    const first=play(setup(),'ward'),secondPlayer=play(first,'ward',0,true)
    expect(secondPlayer.block).toBe(6)
    expect(secondPlayer.blockSources.map(p=>p.windowsLeft).sort()).toEqual([1,2])
    const second=resolveEnemyPhase(secondPlayer)
    expect(second.block).toBe(3);expect(second.blockSources).toHaveLength(1)
    expect(wait(second).block).toBe(0)
    let pools=[{id:'bastion',name:'Bastion',amount:8,windowsLeft:3}]
    for(let i=0;i<100;i++)pools=grantBlock(pools,{id:'bastion',name:'Bastion',amount:8,windowsLeft:3})
    expect(blockTotal(pools)).toBe(8)
    const before=structuredClone(pools),mixed=grantBlock(pools,{id:'card',name:'Ward',amount:3,windowsLeft:1})
    const spent=spendBlock(mixed,4)
    expect(spent).toEqual([{id:'bastion',name:'Bastion',amount:7,windowsLeft:3}]);expect(pools).toEqual(before)
    expect(tickBlock(tickBlock(tickBlock(spent)))).toEqual([])
  })
  it('invalid actions do not tick, and carried card Block still protects during Q/Defend',()=>{
    const first=play(setup(),'ward'),before=structuredClone(first)
    expect(resolveTurn(first,{kind:'move',destination:cell(-1,3)})).toBeNull();expect(first).toEqual(before)
    const guarded=resolveTurn(sparring(first),{kind:'defend'})!
    expect(guarded.hp).toBe(12);expect(guarded.block).toBe(0);expect(guarded.guarding).toBe(false)
    expect(wait(guarded).hp).toBe(10)
  })
  it('actual floor/death/reset boundaries clear protection and Training restores the exact original pools',()=>{
    const original=usePawnStore.getState(),active=resolveTurn(setup('rook','dark'),{kind:'ability'})!
    try{
      usePawnStore.setState({...active,mode:'run',training:null,runActive:true,phase:'ready'})
      const saved=structuredClone({block:active.block,blockSources:active.blockSources,fortified:active.fortified})
      expect(usePawnStore.getState().enterTraining()).toBe(true)
      usePawnStore.getState().train({kind:'form',form:'rook',attunement:'light'})
      expect(usePawnStore.getState().tryAbility()).toBe(true)
      let s=usePawnStore.getState();s.advancePlayback(s.actionId,'player');s.advancePlayback(s.actionId,'enemies')
      expect(usePawnStore.getState().leaveTraining()).toBe(true)
      s=usePawnStore.getState();expect({block:s.block,blockSources:s.blockSources,fortified:s.fortified}).toEqual(saved)
      expect(s.transitionFloor('protection-next-floor',true)).toBe(true)
      expect(usePawnStore.getState()).toMatchObject({block:0,blockSources:[],fortified:undefined})
      expect(usePawnStore.getState().signatures.cooldowns.rook).toBe(9)
      usePawnStore.setState({...active,mode:'run',training:null,runActive:true,phase:'ready'})
      usePawnStore.getState().debugDefeat()
      expect(usePawnStore.getState()).toMatchObject({block:0,blockSources:[],fortified:undefined})
    }finally{usePawnStore.setState(original,true)}
  })
})

function parts(node:ReactNode):{shape?:string;size?:readonly number[];at?:readonly number[];name?:string}[]{
  return Children.toArray(node).flatMap(child=>isValidElement<{children?:ReactNode;shape?:string;size?:readonly number[];at?:readonly number[];name?:string}>(child)?[child.props,...parts(child.props.children)]:[])
}
describe('Hallowed/Void equipment and geometry',()=>{
  it('Bishop equips exactly one physical casting weapon per attunement, with no hidden spare',()=>{
    expect([-1,1].map(side=>handEquipment('bishop','light',side))).toEqual([undefined,'staff'])
    expect([-1,1].map(side=>handEquipment('bishop','dark',side))).toEqual(['tome',undefined])
    expect(Weapon({form:'bishop',variant:'light',side:-1})).toBeNull()
    expect(Weapon({form:'bishop',variant:'dark',side:1})).toBeNull()
    const staff=parts(Weapon({form:'bishop',variant:'light',side:1}))
    expect(staff.some(p=>p.name==='hallowed-ceremonial-staff')).toBe(true)
    expect(staff.some(p=>p.shape==='cylinder')).toBe(true)
    expect(equipmentByForm.rook).toEqual({light:'hallowed-hammer',dark:'void-mace'})
    for(const variant of ['light','dark'] as const)expect(parts(Weapon({form:'rook',variant})).some(p=>p.shape==='axe')).toBe(false)
  })
  it.each(['knight','bishop','rook','queen','king'] as const)('%s uses structurally different headwear, armor and stance',form=>{
    const light=parts(CorruptionArmor({form,variant:'light'})),dark=parts(CorruptionArmor({form,variant:'dark'}))
    expect(light.map(p=>[p.shape,p.size,p.at])).not.toEqual(dark.map(p=>[p.shape,p.size,p.at]))
    expect(dark.some(p=>p.shape==='raggedCloth')).toBe(true)
    expect(parts(Head({form,variant:'light',mane:createRef<Group>()}))).not.toEqual(parts(Head({form,variant:'dark',mane:createRef<Group>()})))
    expect(characterPose(form,'idle',0,false,'light')).not.toEqual(characterPose(form,'idle',0,false,'dark'))
  })
  it('keeps Pawn uncorrupted and uses real void sword cutouts instead of recoloring a filled blade',()=>{
    expect(characterPose('pawn','idle',0,false,'light')).toEqual(characterPose('pawn','idle',0,false,'dark'))
    expect(CorruptionArmor({form:'pawn',variant:'dark'})).toBeNull()
    expect(geometry.voidBlade.parameters.shapes).not.toBe(geometry.greatblade.parameters.shapes)
    expect(parts(Weapon({form:'king',variant:'dark'})).filter(p=>p.shape==='greatblade')).toHaveLength(0)
    expect(parts(Weapon({form:'king',variant:'dark'})).some(p=>p.shape==='voidBlade')).toBe(true)
  })
  it('hammer faces and greatsword edges lead the down/forward strike while the broad flat remains perpendicular',()=>{
    const solve=createArmSolver(),strike=new Vector3(0,-0.85,0.52).normalize()
    for(const form of ['rook','king'] as const)for(const variant of ['light','dark'] as const){
      const p=characterPose(form,'attack',characterTiming[form].impact/characterTiming[form].basic,false,variant),grip=handPose(form,p,1,variant),torso=new Euler(p.lean,p.twist,0)
      const edge=new Vector3(1,0,0).applyEuler(new Euler(...grip.rotation)).applyEuler(torso)
      const flat=new Vector3(0,0,1).applyEuler(new Euler(...grip.rotation)).applyEuler(torso)
      expect(edge.dot(strike)).toBeGreaterThan(0.999);expect(Math.abs(flat.dot(strike))).toBeLessThan(0.001)
      for(const cue of ['idle','attack','signature','counter'] as const)for(let i=0;i<=50;i++)for(const side of [-1,1] as const){
        const pose=characterPose(form,cue,i/50,false,variant),socket=handPose(form,pose,side,variant)
        const joints=solve(new Vector3(side*characterDesigns[form].shoulder,0.81,0),socket.position,socket.rotation,side)
        expect(joints.wrist.distanceTo(new Vector3(...socket.position))).toBeLessThan(0.012)
      }
    }
    expect(blockPools({...setup(),block:3})).toMatchObject([{windowsLeft:1,amount:3}])
  })
})
