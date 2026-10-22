import { describe, expect, it } from 'vitest'
import { createTraining, defaultDummy, dummyEnemy, trainingControl } from '../game/logic/training'
import { resolvePlayerAction, resolveTurn } from '../game/logic/combat'
import { applyPlaytest } from '../game/logic/playtesting'
import { abilityReason, resolveSignature } from '../game/logic/signatures'
import { recordAnalysis, emptyAnalysis } from '../game/logic/combatAnalysis'
import { visibleEnemies } from '../game/logic/combatIndicators'
import { cardInspection } from '../ui/cardInspection'
import { enemyLabelOffsets } from '../utils/enemyLabels'
import { enemyStatuses } from '../ui/enemyPresentation'

const c = (column:number,row:number) => ({column,row})
function king(attunement:'light'|'dark'='light') {
  const fresh=createTraining(1)
  return trainingControl(fresh.game,fresh.session,{kind:'form',form:'king',attunement})!
}
describe('training-only King through the existing resolver',()=>{
  it('rejects normal-run grants/replacement, activation, basic actions and direct signature invocation without mutation',()=>{
    const setup=king(), normal={...setup.game,mode:'run' as const}, before=structuredClone(normal)
    expect(resolvePlayerAction(normal,{kind:'attack',targetId:'dummy-1'})).toBeNull()
    expect(resolveSignature(normal,{})).toBeNull()
    expect(abilityReason(normal)).toContain('Training Grounds only')
    expect(applyPlaytest(normal,{kind:'king-availability'})).toBeNull()
    expect(applyPlaytest(normal,{kind:'replace',form:'king',attunement:'light',replace:'knight'})).toBeNull()
    const pawn={...createTraining(2).game,mode:'run' as const,transformations:{...setup.game.transformations,active:null}}
    expect(resolvePlayerAction(pawn,{kind:'transform',form:'king',attunement:'light'})).toBeNull()
    expect(normal).toEqual(before)
  })
  it('builds newly earned Smite once per attack, caps at ten, and preserves single-target basics',()=>{
    let game=king().game
    game.enemies=[dummyEnemy({...defaultDummy(),knockback:false}),dummyEnemy(defaultDummy(1,c(3,4)))]
    for(const smite of [2,4,6,8,10,10]) {
      const before=game.enemies[0].hp,turn=game.turn
      game=resolveTurn(game,{kind:'attack',targetId:'dummy-1'})!
      expect(game.passives.smite).toBe(smite)
      expect(before-game.enemies[0].hp).toBe(5+smite)
      expect(game.enemies[1].hp).toBe(1000)
      expect(game.turn).toBe(turn+1)
      expect(game.events.filter(e=>e.kind==='wait'&&e.actor.startsWith('dummy-'))).toHaveLength(2)
    }
    const setup=king(), switched=trainingControl(game,setup.session,{kind:'form',form:'pawn',attunement:'light'})!
    const again=trainingControl(switched.game,setup.session,{kind:'form',form:'king',attunement:'dark'})!
    expect(resolveTurn(again.game,{kind:'attack',targetId:'dummy-1'})!.passives.smite).toBe(2)
  })
  it.each(['light','dark'] as const)('%s Decree shares Smite after exactly one response and reports actual analysis',attunement=>{
    const setup=king(attunement), game={...setup.game,enemies:[c(4,3),c(5,3),c(3,5)].map((cell,i)=>dummyEnemy({...defaultDummy(i,cell),knockback:false}))}
    const windup=resolvePlayerAction(game,{kind:'ability'})!
    expect(windup.events.some(e=>e.breakdown)).toBe(false)
    const next=resolveTurn(game,{kind:'ability'})!,hits=next.events.filter(e=>e.breakdown)
    expect(hits.map(e=>e.amount)).toEqual(attunement==='light'?[13,7,6]:[10,5,4])
    expect(hits.reduce((sum,e)=>sum+(e.breakdown?.passive??0),0)).toBe(2)
    expect(Math.max(...next.events.filter(e=>e.kind==='wait').map(e=>e.id))).toBeLessThan(hits[0].id)
    expect(next.signatures.cooldowns.king).toBe(8)
    expect(next.turn).toBe(1)
    expect(resolveTurn(next,{kind:'ability'})).toBeNull()
    expect(recordAnalysis(emptyAnalysis(),next.events,1)).toMatchObject({turns:1,attacks:1,total:attunement==='light'?26:19,passive:2})
  })
  it('moves one tile in eight directions, refuses slides/occupied cells and honors boss displacement settings',()=>{
    const setup=king(), game=setup.game
    for(const dx of [-1,0,1])for(const dy of [-1,0,1])if(dx||dy) {
      const destination=c(3+dx,3+dy),next=resolveTurn({...game,enemies:[]},{kind:'move',destination})!
      expect(next.cell).toEqual(destination);expect(next.turn).toBe(1)
    }
    expect(resolveTurn(game,{kind:'move',destination:c(5,3)})).toBeNull()
    expect(resolveTurn(game,{kind:'move',destination:c(4,3)})).toBeNull()
    for(const knockback of [false,true]) {
      const state={...game,passives:{...game.passives,kingBasics:2},enemies:[dummyEnemy({...defaultDummy(),rank:'boss',knockback})]}
      expect(resolveTurn(state,{kind:'attack',targetId:'dummy-1'})!.enemies[0].cell).toEqual(c(knockback?5:4,3))
    }
  })
  it('Poise reduces only the first direct hit in each response; training controls consume no turns',()=>{
    const setup=king(), game={...setup.game,enemies:[c(4,3),c(3,4)].map((cell,i)=>dummyEnemy({...defaultDummy(i,cell),behavior:'sparring'}))}
    const marked=resolveTurn(game,{kind:'wait'})!,hit=resolveTurn(marked,{kind:'wait'})!
    expect(hit.events.filter(e=>e.targetId==='pawn'&&e.kind==='hit').map(e=>e.amount)).toEqual([1,2])
    expect(hit.turn).toBe(2)
    const reset=trainingControl(hit,setup.session,{kind:'restore',resource:'cooldowns'})!
    expect(reset.game.turn).toBe(2)
    expect(reset.game.transformations.active?.form).toBe('king')
  })
})
describe('bounded card inspection and non-intercepting compact HUD data',()=>{
  it.each([[1366,768],[1440,900],[1920,1080],[2560,1440],[360,640]])('fits expanded cards at %ix%i without altering slot geometry',(width,height)=>{
    for(const left of [0,width/2-55,width-110]) {
      const rect={left,top:height-160,width:110,height:146},before={...rect},position=cardInspection(rect,{width,height})
      const scale=Number(position.transform.match(/scale\(([^)]+)\)/)![1])
      expect(scale).toBeCloseTo(1.6)
      expect(position.left-(scale-1)*rect.width/2).toBeGreaterThanOrEqual(11.99)
      expect(position.left+rect.width+(scale-1)*rect.width/2).toBeLessThanOrEqual(width-11.99)
      expect(position.top+rect.height-scale*rect.height-8).toBeGreaterThanOrEqual(11.99)
      expect(position.top+rect.height-8).toBeLessThanOrEqual(height-11.99)
      expect(rect).toEqual(before)
    }
  })
  it('stacks nearby labels upward, leaving heads unobscured and keeping fog filtering upstream',()=>{
    const points=[{id:'a',x:150,y:150},{id:'b',x:180,y:152},{id:'c',x:190,y:155}]
    const offsets=enemyLabelOffsets(points,500),ys=points.map(p=>p.y+offsets.get(p.id)!)
    for(let i=0;i<ys.length;i++)for(let j=i+1;j<ys.length;j++)expect(Math.abs(ys[i]-ys[j])).toBeGreaterThanOrEqual(29)
    expect([...offsets.values()].every(value=>value<=0)).toBe(true)
    const game=king().game,target={...game.enemies[0],bleed:[{turnsLeft:1,appliedTurn:0},{turnsLeft:3,appliedTurn:2}]}
    expect(enemyStatuses(target).find(s=>s.tone==='bleed')).toMatchObject({count:2,label:'Bleed: remaining ticks 1, 3'})
    expect(visibleEnemies({...game,visible:new Set(),enemies:[target]})).toEqual([])
  })
})
