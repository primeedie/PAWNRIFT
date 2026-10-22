import { describe,expect,it } from 'vitest'
import { Euler,Group,Vector3 } from 'three'
import { characterDesigns,characterTiming } from '../data/characterDesigns'
import { passiveBalance } from '../data/passives'
import { characterPose } from '../utils/characterAnimation'
import { armLengths,createArmSolver,handPose,katanaMount,katanaRest,katanaScale,sheathPosition } from '../utils/characterRig'
import { attackTargets,resolvePlayerAction,resolveTurn } from '../game/logic/combat'
import { createTraining,defaultDummy,trainingControl } from '../game/logic/training'
import { cellId } from '../game/logic/dungeon'
import { signatureFog } from '../game/logic/signatures'
import { basicAttackPattern,movementPreviews } from '../game/logic/formCombat'
import { characterStats } from '../ui/inspectionPresentation'
import { impactPresentationDelay } from '../utils/combatPresentation'
import { usePawnStore } from '../game/state/pawnStore'

const c=(column:number,row:number)=>({column,row})
const forms=['pawn','knight','bishop','rook','queen','king'] as const
function bishop(cells=[c(5,3)]) {
  const training=createTraining(10,'open',cells.map((cell,i)=>defaultDummy(i,cell)))
  return trainingControl(training.game,training.session,{kind:'form',form:'bishop',attunement:'light'})!.game
}
describe('Bishop clear-lane magic targeting',()=>{
  it('accepts all four straight distances 1/2 and four diagonal neighbors; rejects diagonals 2 and distance 3',()=>{
    const origin=c(3,3)
    for(let row=0;row<8;row++)for(let column=0;column<8;column++) {
      const dx=Math.abs(column-3),dy=Math.abs(row-3),target=c(column,row)
      const expected=(dx+dy>0&&dx<=1&&dy<=1)||((dx===0||dy===0)&&dx+dy===2)
      expect(basicAttackPattern('bishop',origin,target)).toBe(expected)
      if(dx+dy===0)continue
      const state=bishop([target]),before=structuredClone(state),action={kind:'attack',targetId:'dummy-1'} as const
      expect(attackTargets(state).length).toBe(expected?1:0)
      const next=resolveTurn(state,action)
      if(expected){expect(next!.turn).toBe(1);expect(next!.enemies[0].hp).toBe(997)}else expect(next).toBeNull()
      expect(state).toEqual(before)
    }
  })
  it('rejects walls, solid props, occupied or missing lane/target cells and intervening living enemies without mutation',()=>{
    const base=bishop(),middle=c(4,3)
    for(const blockedCell of [middle,c(5,3)]) {
      const variants=[
        {...base,occupied:[blockedCell]},
        {...base,dungeon:{...base.dungeon,tiles:base.dungeon.tiles.filter(tile=>cellId(tile)!==cellId(blockedCell))}},
        ...[false,true].map(blocksSight=>({...base,dungeon:{...base.dungeon,tiles:base.dungeon.tiles.map(tile=>cellId(tile)===cellId(blockedCell)?{...tile,blocksMovement:true,blocksSight}:tile)}})),
      ]
      for(const state of variants){const before=structuredClone(state);expect(resolveTurn(state,{kind:'attack',targetId:'dummy-1'})).toBeNull();expect(state).toEqual(before)}
    }
    const blocked=bishop([c(5,3),middle])
    expect(attackTargets(blocked).map(e=>e.id)).toEqual(['dummy-2'])
    expect(resolveTurn(blocked,{kind:'attack',targetId:'dummy-1'})).toBeNull()
    expect(attackTargets({...blocked,enemies:blocked.enemies.map(e=>e.id==='dummy-2'?{...e,hp:0}:e)}).map(e=>e.id)).toEqual(['dummy-1'])
  })
  it('does not expand sight or reveal remembered targets; full training/Eye visibility permits the longer attack',()=>{
    const base=bishop(),normal={...base,trainingVision:'fog' as const}
    const state={...normal,...signatureFog(normal)}
    expect(state.visible.has(cellId(c(5,3)))).toBe(false)
    expect(resolveTurn({...state,explored:new Set(base.dungeon.tiles.map(cellId))},{kind:'attack',targetId:'dummy-1'})).toBeNull()
    const eye={...state,signatures:{...state.signatures,reveal:{cells:[cellId(c(5,3))],turnsLeft:2,foresight:false}}}
    // The authoritative target visibility set is shared by full Training and temporary reveals.
    expect(resolveTurn({...eye,...signatureFog(eye)},{kind:'attack',targetId:'dummy-1'})!.turn).toBe(1)
    expect(movementPreviews(state)).toEqual(movementPreviews({...state,enemies:[]}))
    expect(characterStats(base)).toMatchObject({range:2,directions:'Orthogonal 2 / diagonal 1'})
  })
  it('keeps selected primary damage, separate bounded Swish and checker-color Burn without Knight penetration',()=>{
    const state=bishop([c(5,3),c(5,4),c(6,3)])
    state.enemies[0].defense=2
    const next=resolvePlayerAction(state,{kind:'attack',targetId:'dummy-1'})!
    const hits=next.events.filter(e=>e.actor==='pawn'&&e.kind==='hit')
    expect(hits.map(e=>[e.targetId,e.amount])).toEqual([['dummy-1',1],['dummy-2',1],['dummy-3',1]])
    expect(hits[0].penetrated).toBe(0)
    expect(next.enemies[0].burn).toBeUndefined() // two straight tiles retain checker color
    const adjacent=resolvePlayerAction(bishop([c(4,3)]),{kind:'attack',targetId:'dummy-1'})!
    expect(adjacent.enemies[0].burn?.turnsLeft).toBe(passiveBalance.burnTurns)
  })
})

describe('articulated weapon presentation',()=>{
  it('keeps bent elbows, hand sockets, and two-hand grips connected without limb scaling',()=>{
    const solve=createArmSolver()
    for(const form of forms)for(const cue of ['idle','move','attack','signature','defend','counter'] as const)for(let i=0;i<=50;i++)for(const side of [-1,1] as const){
      const p=characterPose(form,cue,i/50),socket=handPose(form,p,side),shoulder=new Vector3(side*characterDesigns[form].shoulder,0.81,0)
      const joints=solve(shoulder,socket.position,socket.rotation,side)
      expect(joints.elbow.distanceTo(shoulder)).toBeCloseTo(armLengths.upper,7)
      expect(joints.wrist.distanceTo(joints.elbow)).toBeCloseTo(armLengths.forearm,7)
      expect(joints.wrist.distanceTo(new Vector3(...socket.position)),`${form}/${cue}/${i}/${side}`).toBeLessThan(0.012)
      const arm=new Group(),forearm=new Group(),hand=new Group()
      arm.position.copy(shoulder);arm.quaternion.copy(joints.upperRotation);arm.add(forearm)
      forearm.position.set(0,-armLengths.upper,0);forearm.quaternion.copy(joints.lowerRotation);forearm.add(hand)
      hand.position.set(0,-armLengths.forearm,0);hand.quaternion.copy(joints.handRotation);arm.updateMatrixWorld(true)
      expect(hand.getWorldPosition(new Vector3()).distanceTo(joints.wrist)).toBeLessThan(1e-7)
      const actual=new Vector3(0,1,0).applyQuaternion(hand.getWorldQuaternion(arm.quaternion.clone()))
      expect(actual.distanceTo(new Vector3(0,1,0).applyEuler(new Euler(...socket.rotation)))).toBeLessThan(1e-7)
      if(side===-1&&(form==='rook'||form==='king'||form==='knight')) {
        const right=handPose(form,p,1),grip=new Vector3(0,-0.115,0).applyEuler(new Euler(...right.rotation)).add(new Vector3(...right.position))
        expect(grip.distanceTo(new Vector3(...socket.position))).toBeLessThan(1e-7)
      }
    }
  })
  it('withdraws the real blade along the sheath axis before turning, then seats it before Sharpener',()=>{
    const start=handPose('pawn',characterPose('pawn','idle',0),1)
    expect(start.position).toEqual(katanaMount);expect(start.rotation).toEqual(katanaRest)
    const clear=characterPose('pawn','attack',0.255),right=handPose('pawn',clear,1),scabbard=sheathPosition(clear.draw)
    expect(right.rotation).toEqual(katanaRest)
    const axis=new Vector3(0,1,0).applyEuler(new Euler(...katanaRest))
    const relative=new Vector3(...right.position).sub(new Vector3(...scabbard))
    expect(relative.dot(axis)).toBeCloseTo(-0.65)
    expect(relative.clone().cross(axis).length()).toBeLessThan(1e-6)
    expect(0.65).toBeGreaterThan((1.05-0.14)*katanaScale)
    expect(characterPose('pawn','attack',0.32).bladeTurn).toBe(1)
    expect(characterPose('pawn','attack',passiveBalance.followupMs/characterTiming.pawn.basic).draw).toBe(0)
    expect(characterPose('pawn','attack',1).draw).toBe(0)
  })
  it('provides distinct weapon-driven poses at configured impact, returning grips to their stance',()=>{
    const signatures=new Set<string>()
    for(const form of forms){
      const idle=characterPose(form,'idle',0),hit=characterPose(form,'attack',characterTiming[form].impact/characterTiming[form].basic)
      signatures.add(JSON.stringify(handPose(form,hit,1)))
      const end=characterPose(form,'attack',1)
      expect(handPose(form,end,1)).toEqual(handPose(form,idle,1))
      expect(handPose(form,hit,1)).not.toEqual(handPose(form,idle,1))
    }
    expect(signatures.size).toBe(6)
  })
  it('aims each physical weapon through the victim direction despite torso rotation',()=>{
    for(const form of ['pawn','knight','rook','queen','king'] as const){
      const p=characterPose(form,'attack',characterTiming[form].impact/characterTiming[form].basic)
      const grip=handPose(form,p,1),torso=new Euler(p.lean,p.twist,0)
      const origin=new Vector3(...grip.position).applyEuler(torso)
      const axis=new Vector3(0,1,0).applyEuler(new Euler(...grip.rotation)).applyEuler(torso)
      const toward=new Vector3(0,0.65,1).sub(origin).normalize()
      expect(axis.dot(toward),form).toBeGreaterThan(0.995)
    }
  })
  it('sequences resolved Bishop splash after the primary without modifying events or damage',()=>{
    const next=resolvePlayerAction(bishop([c(5,3),c(5,4)]),{kind:'attack',targetId:'dummy-1'})!
    const before=structuredClone(next),hits=next.events.filter(e=>e.actor==='pawn'&&e.kind==='hit')
    expect(hits.map(event=>impactPresentationDelay(event,next.events,'bishop'))).toEqual([characterTiming.bishop.impact,characterTiming.bishop.impact+45])
    for(let i=0;i<200;i++)for(const event of hits)impactPresentationDelay(event,next.events,'bishop')
    expect(next).toEqual(before)
  })
  it('repeated Light/Dark training attacks, pose sampling and duplicate/stale callbacks never duplicate a world response',()=>{
    const original=usePawnStore.getState(),fresh=createTraining(100)
    try {
      usePawnStore.setState({...fresh.game,training:fresh.session,runActive:true,phase:'ready',actionId:original.actionId+1})
      for(const form of forms)for(const attunement of ['light','dark'] as const){
        expect(usePawnStore.getState().train({kind:'form',form,attunement})).toBe(true)
        expect(usePawnStore.getState().train({kind:'reset'})).toBe(true)
        for(let n=0;n<3;n++){
          let s=usePawnStore.getState(),turn=s.turn
          expect(s.tryAttack('dummy-1')).toBe(true)
          s=usePawnStore.getState();const actionId=s.actionId,snapshot=structuredClone({hp:s.hp,enemies:s.enemies,passives:s.passives,energy:s.energy,eventSerial:s.eventSerial})
          for(let i=0;i<200;i++) {characterPose(form,'attack',i/199);handPose(form,characterPose(form,'attack',i/199),1)}
          expect({hp:s.hp,enemies:s.enemies,passives:s.passives,energy:s.energy,eventSerial:s.eventSerial}).toEqual(snapshot)
          s.advancePlayback(actionId,'player');s.advancePlayback(actionId,'player')
          s=usePawnStore.getState();expect(s.turn).toBe(turn+1)
          for(const enemy of s.enemies)expect(s.events.filter(e=>e.actor===enemy.id)).toHaveLength(1)
          s.advancePlayback(actionId,'enemies');s.advancePlayback(actionId,'enemies')
          expect(usePawnStore.getState().turn).toBe(turn+1)
          // King third-hit push can leave adjacency; explicit free training placement.
          if(form==='king')usePawnStore.getState().train({kind:'dummy-reset'})
        }
        const stale=usePawnStore.getState().actionId
        expect(usePawnStore.getState().train({kind:'reset'})).toBe(true)
        const reset=usePawnStore.getState();reset.advancePlayback(stale,'player');reset.advancePlayback(stale,'enemies')
        expect(usePawnStore.getState()).toBe(reset)
      }
    } finally {usePawnStore.setState(original,true)}
  })
})
