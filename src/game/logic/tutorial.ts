import { tutorialLesson, type LessonId, type TutorialStep } from '../../data/tutorials'
import { bossForms, type Attunement } from '../../data/forms'
import type { CardId } from '../../data/cards'
import type { GameState, PlayerAction } from './combat'
import { createTraining, defaultDummy, trainingControl, type TrainingSession } from './training'
import { cellId, cellFromId } from './dungeon'
import { sameCell } from './movement'
import { chooseAstralRegion, signatureFog } from './signatures'
import { emptyTransformations, grantTransformation, currentForm } from './transformations'
import { formAttackTargets } from './formCombat'

export type PracticeForm = typeof bossForms[number]
export type TutorialSession = {
  id:number; lesson:LessonId; step:number; sequence:boolean; form:PracticeForm; attunement:Attunement
  done:boolean; passed:string[]; message:string; accepted?:PlayerAction['kind']; paid?:{before:number;after:number}
  inspectedAtTurn?:number; finished?:boolean; exitRequested?:boolean
  evidence?:{revealed:boolean;concealed:boolean;card?:CardId}
}
export type TutorialSignal = {kind:'player';action:PlayerAction} | {kind:'response'}
  | {kind:'enemy-inspected';id:string} | {kind:'character-inspected'} | {kind:'card-inspected';id:string}
export const tutorialStep = (session:TutorialSession):TutorialStep=>tutorialLesson(session.lesson).steps[session.step]
export const lessonCompleted = (session:TutorialSession)=>tutorialLesson(session.lesson).steps.every(step=>session.passed.includes(step.id))
export function tutorialObjective(session:TutorialSession,state:GameState){
  if(session.done||session.finished)return undefined
  const step=tutorialStep(session)
  const target=step.target?(step.cue==='inspect'?state.enemies.find(enemy=>enemy.hp>0&&state.visible.has(cellId(enemy.cell)))?.cell:formAttackTargets(state)[0]?.cell):undefined
  const cell=step.highlight??target
  return cell&&state.visible.has(cellId(cell))?cell:undefined
}
export function newTutorial(id:number,lesson:LessonId,sequence=false):TutorialSession {
  return {id,lesson,step:0,sequence,form:'knight',attunement:'light',done:false,passed:[],message:''}
}

// Controlled fixtures use the existing arena, deck, items and sparring system.
// No damage, status application or lesson completion is scripted into the fixtures.
export function tutorialExercise(session:TutorialSession):{game:GameState;session:TrainingSession} {
  const fixture=tutorialStep(session).fixture??'empty'
  const noTarget=fixture==='empty',fog=fixture==='fog',eye=fixture==='exposed'||(fixture==='form-ability'&&session.form==='bishop')
  const obstacle=fixture==='obstacle'
  const specs=noTarget?[]:[{...defaultDummy(0,fog?{column:5,row:3}:obstacle?{column:3,row:4}:{column:4,row:3}),hp:100,
    defense:fixture==='form'&&session.form==='knight'?10:0,
    behavior:['clock','guard','block','parry','riposte','bastion','fear'].includes(fixture)?'sparring' as const:'passive' as const,
    pattern:['block','parry','riposte','bastion'].includes(fixture)?'melee' as const:'telegraphed' as const}]
  let arena=createTraining(session.id,'open',specs)
  let game=arena.game
  if(obstacle||fog){
    const walls=obstacle?[28]:[20,21]
    game={...game,dungeon:{...game.dungeon,tiles:game.dungeon.tiles.map(tile=>walls.includes(cellId(tile))?{...tile,blocksMovement:true,blocksSight:true,prop:'wall'}:tile)}}
  }
  const form=fixture==='bastion'||fixture==='stun'?'rook':fixture==='burn'||eye?'bishop':fixture==='bleed'||fixture==='fear'?'queen'
    :fixture==='form'||fixture==='form-ability'?session.form:'pawn'
  if(form!=='pawn')game=trainingControl(game,arena.session,{kind:'form',form,attunement:fixture==='bastion'?'dark':fixture==='exposed'||fixture==='burn'?'light':session.attunement})!.game
  if(fixture==='item'){
    let items=grantTransformation(emptyTransformations(),session.form,'light')!
    items=grantTransformation(items,session.form,'dark')!
    game={...game,transformations:items}
  }
  if(fixture==='guard')game={...game,enemies:game.enemies.map(enemy=>({...enemy,intent:'attack',attackTarget:{...game.cell}}))}
  const handOrder:CardId[]=['cut','ward','focus','riposte']
  const priority:Partial<Record<typeof fixture,CardId>>={block:'ward',riposte:'riposte',focus:'focus'}
  const first=priority[fixture]
  const order=first?[first,...handOrder.filter(id=>id!==first)]:handOrder
  const all=[...game.deck.hand,...game.deck.draw,...game.deck.discard],used=new Set<string>()
  const hand=order.map(id=>{const instance=all.find(card=>card.definitionId===id&&!used.has(card.instanceId))!;used.add(instance.instanceId);return instance})
  game={...game,energy:fixture==='cards'?1:game.energy,deck:{...game.deck,hand,draw:all.filter(card=>!used.has(card.instanceId)),discard:[]}}
  if(fog||eye){
    game={...game,trainingVision:'fog',explored:new Set()}
    game={...game,...signatureFog(game)}
    if(eye){
      const cells=chooseAstralRegion(game.dungeon,game.explored,game.turn)!
      const hidden=cells.find(id=>!game.visible.has(id)&&!game.dungeon.tiles[id].blocksMovement)!
      const position=cellFromId(hidden)
      game={...game,enemies:game.enemies.map(enemy=>({...enemy,cell:position,from:position}))}
    }
  }else game={...game,...signatureFog(game)}
  // Metadata describes these actual entities; inspection and analysis reuse Training.
  arena={game,session:{...arena.session,dummies:specs.map((spec,i)=>({...spec,cell:game.enemies[i].cell}))}}
  return arena
}

// Observe accepted commands/resolved phases, never instructional-button clicks.
export function observeTutorial(session:TutorialSession,before:GameState,after:GameState,signal:TutorialSignal):TutorialSession {
  if(session.done)return session
  let next={...session,message:''}
  const step=tutorialStep(session),events=after.events.filter(event=>event.seen)
  if(signal.kind==='player'){
    next.accepted=signal.action.kind
    next.evidence={revealed:after.enemies.some(enemy=>enemy.hp>0&&after.visible.has(cellId(enemy.cell))&&!before.visible.has(cellId(enemy.cell))),
      concealed:before.enemies.some(enemy=>enemy.hp>0&&before.visible.has(cellId(enemy.cell))&&!after.visible.has(cellId(enemy.cell))),
      card:signal.action.kind==='card'?before.deck.hand.find(card=>card.instanceId===('cardInstanceId' in signal.action?signal.action.cardInstanceId:''))?.definitionId:undefined}
    if(signal.action.kind==='card')next.paid={before:before.energy,after:after.energy}
    return next
  }
  const response=signal.kind==='response'&&after.turn===before.turn+1
  const enemy=signal.kind==='enemy-inspected'?after.enemies.find(enemy=>enemy.id===signal.id&&enemy.hp>0&&after.visible.has(cellId(enemy.cell))):undefined
  const card=signal.kind==='card-inspected'?after.deck.hand.find(card=>card.instanceId===signal.id):undefined
  const did=(kind:PlayerAction['kind'])=>response&&session.accepted===kind
  const hit=(effect:string)=>response&&events.some(event=>event.kind==='hit'&&event.effect===effect&&(event.amount??0)>0)
  let success=false
  switch(step.goal){
    case 'destination':success=did('move')&&!!step.highlight&&sameCell(after.cell,step.highlight);break
    case 'move':success=did('move')&&events.some(event=>event.kind==='move'&&event.actor==='pawn');break
    case 'basic':success=did('attack')&&events.some(event=>event.actor==='pawn'&&event.kind==='hit');break
    case 'enemy-inspected':success=!!enemy; if(success)next.inspectedAtTurn=after.turn;break
    case 'character-inspected':success=signal.kind==='character-inspected'&&after.block>0;break
    case 'card-inspected':success=!!card&&(!step.card||card.definitionId===step.card);break
    case 'response':success=response&&events.some(event=>event.actor!=='pawn');break
    case 'card':success=did('card')&&!!session.paid&&session.paid.before>session.paid.after&&(!step.card||session.evidence?.card===step.card);break
    case 'energy':success=response&&after.energy>before.energy;break
    case 'defend':success=did('defend')&&events.some(event=>event.kind==='counter')&&events.some(event=>event.targetId==='pawn'&&event.kind==='hit'&&event.amount===0);break
    case 'block':success=did('card')&&after.block>0&&events.some(event=>event.targetId==='pawn'&&(event.blocked??0)>0);break
    case 'block-expired':success=response&&before.block>0&&after.block===0;break
    case 'parry':success=response&&events.some(event=>event.kind==='parry'&&event.parryKind==='samurai');break
    case 'counter':success=did('card')&&events.some(event=>event.kind==='counter'&&event.breakdown?.source==='Riposte');break
    case 'bastion':success=did('ability')&&after.blockSources.some(pool=>pool.id==='iron-bastion');break
    case 'transform':success=did('transform')&&currentForm(after.transformations)===session.form;break
    case 'ability':success=did('ability');break
    case 'reveal':success=did('move')&&!!session.evidence?.revealed;break
    case 'conceal':success=did('move')&&!!session.evidence?.concealed;break
    case 'burn':success=hit('burn');break
    case 'bleed':success=hit('bleed')&&after.enemies.some(enemy=>(enemy.bleed?.length??0)>=2);break
    case 'stun':success=response&&events.some(event=>event.kind==='stun');break
    case 'fear':success=response&&events.some(event=>event.kind==='fear'&&event.actor!=='pawn');break
    case 'exposed':success=did('ability')&&after.enemies.some(enemy=>after.visible.has(cellId(enemy.cell))&&(enemy.exposedTurns??0)>0);break
    case 'focus':success=did('card')&&after.focus>0&&events.some(event=>event.kind==='focus');break
  }
  if(success){next.done=true;next.passed=[...new Set([...session.passed,step.id])];next.message='Objective complete.'}
  return next
}

export function tutorialRejection(state:GameState,action:PlayerAction){
  if(action.kind==='move'){
    const tile=state.dungeon.tiles.find(tile=>sameCell(tile,action.destination))
    if(tile&&state.visible.has(cellId(tile))){
      if(tile.blocksMovement)return 'A wall or obstacle blocks that tile. Try a clear route; no turn spent.'
      if(state.enemies.some(enemy=>enemy.hp>0&&sameCell(enemy.cell,tile)))return 'That visible tile is occupied. Movement and attacks are separate; no turn spent.'
    }
    return 'Move rejected. Check your form’s pattern, clear terrain and current sight. No turn spent.'
  }
  return 'Action unavailable. Check the visible target, range, clear lane, Energy or cooldown. No turn spent.'
}
