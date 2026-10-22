import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePawnStore } from '../game/state/pawnStore'
import { useAppStore } from '../game/state/appStore'
import { useTutorialProgress, readTutorialSettings } from '../game/state/tutorialProgress'
import { tutorials, tutorialLesson } from '../data/tutorials'
import { bossForms } from '../data/forms'
import { glossary } from '../data/glossary'
import { newTutorial, tutorialExercise, tutorialObjective, tutorialStep } from '../game/logic/tutorial'
import { formMovement } from '../game/logic/chessMovement'
import { resolveTurn } from '../game/logic/combat'
import { movementPreviews } from '../game/logic/formCombat'
import { vaultDestinations, vaultTargets } from '../game/logic/signatures'
import { cellId } from '../game/logic/dungeon'
import { inspectedEnemy, clickEnemy, useInspectionStore } from '../ui/inspectionStore'
import { TutorialPanel } from '../ui/TutorialPanel'
import { TutorialLibrary } from '../ui/TutorialLibrary'
import { TitleScreen } from '../ui/TitleScreen'
import { startTutorial, exitTutorial } from '../ui/tutorialNavigation'
import { movementDiagram, MovementGuide } from '../ui/MovementGuide'
import { AttackGuide } from '../ui/AttackGuide'

vi.mock('../game/state/pawnStore',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../game/state/pawnStore')>()
  return {...actual,usePawnStore:Object.assign((selector?:(state:ReturnType<typeof actual.usePawnStore.getState>)=>unknown)=>{
    const state=actual.usePawnStore.getState();return selector?selector(state):state
  },actual.usePawnStore)}
})
vi.mock('../game/state/tutorialProgress',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../game/state/tutorialProgress')>()
  return {...actual,useTutorialProgress:Object.assign((selector?:(state:ReturnType<typeof actual.useTutorialProgress.getState>)=>unknown)=>{
    const state=actual.useTutorialProgress.getState();return selector?selector(state):state
  },actual.useTutorialProgress)}
})

const original=usePawnStore.getState(),originalProgress=useTutorialProgress.getState()
const data=()=>structuredClone(Object.fromEntries(Object.entries(usePawnStore.getState()).filter(([key,value])=>typeof value!=='function'&&key!=='actionId')))
const c=(column:number,row:number)=>({column,row})
function finish(){let state=usePawnStore.getState();const id=state.actionId;state.advancePlayback(id,'player');state=usePawnStore.getState();state.advancePlayback(id,'enemies')}
function act(run:()=>boolean){expect(run()).toBe(true);finish()}
function card(id:'cut'|'ward'|'riposte'|'focus'){
  const s=usePawnStore.getState(),instance=s.deck.hand.find(card=>card.definitionId===id)!
  s.selectCard(instance.instanceId)
  act(()=>usePawnStore.getState().playSelectedCard(id==='cut'?{kind:'enemy',enemyId:s.enemies[0].id}:{kind:'self'}))
}
function ability(){
  const s=usePawnStore.getState();s.selectAbility()
  if(s.transformations.active?.form==='knight'){
    const destination=vaultDestinations(s)[0],target=vaultTargets(s,destination)[0]
    expect(usePawnStore.getState().selectAbilityDestination(destination)).toBe(true)
    act(()=>usePawnStore.getState().tryAbility(target.id))
  }else act(()=>usePawnStore.getState().tryAbility())
}
function performStep(){
  const s=usePawnStore.getState(),session=s.tutorial!,step=tutorialStep(session)
  useInspectionStore.getState().dismiss()
  switch(step.goal){
    case 'destination':
      if(step.fixture==='obstacle')act(()=>usePawnStore.getState().tryMove(c(3,2)))
      act(()=>usePawnStore.getState().tryMove(step.highlight!));break
    case 'move':act(()=>s.tryMove(movementPreviews(s)[0]));break
    case 'basic':act(()=>s.tryAttack());break
    case 'enemy-inspected':{
      const target=s.enemies.find(enemy=>s.visible.has(cellId(enemy.cell)))!
      expect(clickEnemy(target.id)).toBe('inspect');break
    }
    case 'character-inspected':useInspectionStore.getState().toggleCharacter();break
    case 'card-inspected':s.observeTutorialUI({kind:'card-inspected',id:s.deck.hand.find(card=>card.definitionId===step.card)!.instanceId});break
    case 'response':case 'energy':act(()=>s.submitAction({kind:'wait'}));break
    case 'card':card('cut');break
    case 'defend':act(()=>s.submitAction({kind:'defend'}));break
    case 'block':card('ward');break
    case 'block-expired':for(let i=0;i<3&&!usePawnStore.getState().tutorial!.done;i++)act(()=>usePawnStore.getState().submitAction({kind:'wait'}));break
    case 'parry':case 'bastion':case 'ability':case 'fear':case 'exposed':ability();break
    case 'counter':card('riposte');break
    case 'transform':act(()=>s.submitAction({kind:'transform',form:session.form,attunement:session.attunement}));break
    case 'reveal':act(()=>s.tryMove(c(4,3)));break
    case 'conceal':act(()=>s.tryMove(c(3,3)));break
    case 'burn':case 'stun':act(()=>s.tryAttack());act(()=>usePawnStore.getState().submitAction({kind:'wait'}));break
    case 'bleed':act(()=>s.tryAttack());act(()=>usePawnStore.getState().tryAttack());break
    case 'focus':card('focus');break
  }
  expect(usePawnStore.getState().tutorial?.done,`${session.lesson}/${step.id}`).toBe(true)
}

beforeEach(()=>{
  usePawnStore.setState(original,true);useAppStore.setState({screen:'title'})
  useInspectionStore.getState().dismiss();useTutorialProgress.setState({promptSeen:false,completed:[]})
})
afterEach(()=>{
  if(usePawnStore.getState().tutorial)exitTutorial()
  if(usePawnStore.getState().training)usePawnStore.getState().leaveTraining()
  usePawnStore.setState(original,true);useTutorialProgress.setState(originalProgress,true);useInspectionStore.getState().dismiss()
})

describe('optional tutorial access and completion',()=>{
  it('offers a skippable first-time prompt, eight replayable lessons, no King reward',()=>{
    const title=renderToStaticMarkup(<TitleScreen/>),library=renderToStaticMarkup(<TutorialLibrary/>)
    expect(title).toContain('New to PAWNRIFT?');expect(title).toContain('Start Tutorial');expect(title).toContain('>Skip</button>')
    expect(tutorials).toHaveLength(8)
    for(const lesson of tutorials){expect(library).toContain(lesson.title.replace('&','&amp;'));for(const step of lesson.steps){for(const topic of step.topics??[])expect(glossary[topic]).toBeDefined()}}
    expect(library).not.toContain('King');expect(usePawnStore.getState().tutorial).toBeNull()
    useTutorialProgress.getState().dismissPrompt()
    expect(renderToStaticMarkup(<TitleScreen/>)).not.toContain('New to PAWNRIFT?')
    expect(usePawnStore.getState().turn).toBe(0)
  })
  it('does not accept Continue, Retry or Skip as gameplay success',()=>{
    usePawnStore.getState().enterTutorial('movement')
    expect(usePawnStore.getState().nextTutorialStep()).toBe(false)
    usePawnStore.getState().retryTutorialStep();expect(usePawnStore.getState().tutorial?.done).toBe(false)
    usePawnStore.getState().nextTutorialStep(true)
    expect(usePawnStore.getState().tutorial?.passed).toEqual([])
    performStep();usePawnStore.getState().nextTutorialStep()
    expect(useTutorialProgress.getState().completed).not.toContain('movement')
    expect(usePawnStore.getState().turn).toBe(2)
  })
  it('completes the entire sequence using real commands, inspections and responses',()=>{
    const before=data();usePawnStore.getState().enterTutorial('movement',true)
    let count=0
    while(!usePawnStore.getState().tutorial?.finished&&count++<50){performStep();expect(usePawnStore.getState().nextTutorialStep()).toBe(true)}
    expect(count).toBe(tutorials.reduce((sum,lesson)=>sum+lesson.steps.length,0))
    expect(useTutorialProgress.getState().completed).toEqual(tutorials.map(lesson=>lesson.id))
    usePawnStore.getState().exitTutorial();expect(data()).toEqual(before)
  })
  it('stores only versioned optional settings, handles corrupt/blocked storage, never a run save',()=>{
    expect(readTutorialSettings({getItem:()=>'{bad'})).toEqual({version:1,promptSeen:false,completed:[]})
    expect(readTutorialSettings({getItem:()=>{throw Error('blocked')}}).completed).toEqual([])
    expect(readTutorialSettings({getItem:()=>JSON.stringify({version:1,promptSeen:true,completed:['movement','unknown','movement']})})).toEqual({version:1,promptSeen:true,completed:['movement']})
    expect(readTutorialSettings({getItem:()=>JSON.stringify({version:2,completed:['cards']})}).completed).toEqual([])
  })
})

describe('separate session snapshots and callback guards',()=>{
  it('restores all run data, targeting and UI navigation exactly with only a fresh action token',()=>{
    useAppStore.getState().play()
    const run=usePawnStore.getState();run.selectCard(run.deck.hand[0].instanceId)
    usePawnStore.setState({energy:1,focus:2,block:3,blockSources:[{id:'saved',name:'Ward',amount:3,windowsLeft:1}],
      signatures:{...run.signatures,cooldowns:{...run.signatures.cooldowns,pawn:4},samuraiCharges:2}})
    useInspectionStore.getState().toggleCharacter()
    const before=data(),ui=useInspectionStore.getState()
    startTutorial('cards');card('cut');usePawnStore.getState().retryTutorialStep()
    expect(exitTutorial()).toBe(true);expect(data()).toEqual(before)
    expect(useAppStore.getState().screen).toBe('scene');expect(useInspectionStore.getState().characterOpen).toBe(ui.characterOpen)
  })
  it('nests inside active Training without overwriting its original run snapshot',()=>{
    useAppStore.getState().play();const run=data()
    expect(usePawnStore.getState().enterTraining()).toBe(true)
    usePawnStore.getState().train({kind:'form',form:'king',attunement:'dark'})
    act(()=>usePawnStore.getState().tryAttack())
    const training=data();usePawnStore.getState().enterTutorial('forms')
    expect(usePawnStore.getState().enterTraining()).toBe(false);expect(usePawnStore.getState().leaveTraining()).toBe(false)
    performStep();usePawnStore.getState().exitTutorial()
    expect(data()).toEqual(training)
    expect(usePawnStore.getState().leaveTraining()).toBe(true);expect(data()).toEqual(run)
  })
  it.each(['player','enemies','targeting','samurai'] as const)('can exit during %s without stale tutorial callbacks or leaked items',phase=>{
    const before=data();usePawnStore.getState().enterTutorial(phase==='samurai'?'defense':'cards')
    if(phase==='samurai'){
      const session=usePawnStore.getState().tutorial!
      while(tutorialStep(usePawnStore.getState().tutorial!).id!=='parry')usePawnStore.getState().nextTutorialStep(true)
      expect(session.lesson).toBe('defense');usePawnStore.getState().tryAbility()
    }else if(phase==='targeting')usePawnStore.getState().selectCard(usePawnStore.getState().deck.hand[0].instanceId)
    else {usePawnStore.getState().tryMove(c(3,2));if(phase==='enemies'){const s=usePawnStore.getState();s.advancePlayback(s.actionId,'player')}}
    const stale=usePawnStore.getState().actionId
    expect(usePawnStore.getState().exitTutorial()).toBe(true)
    usePawnStore.getState().advancePlayback(stale,'player');usePawnStore.getState().advancePlayback(stale,'enemies')
    expect(data()).toEqual(before)
  })
  it('preserves an accepted real response when entering during animation',()=>{
    useAppStore.getState().play();act(()=>usePawnStore.getState().submitAction({kind:'wait'}))
    usePawnStore.getState().submitAction({kind:'wait'});const originalAction=usePawnStore.getState().actionId,before=data()
    usePawnStore.getState().enterTutorial('movement');performStep();usePawnStore.getState().exitTutorial()
    expect(data()).toEqual(before)
    usePawnStore.getState().advancePlayback(originalAction,'player');expect(usePawnStore.getState().turn).toBe(before.turn)
    finish();expect(usePawnStore.getState().turn).toBe((before.turn as number)+1)
  })
  it('blocks progression, external testing mutations and King grants in tutorials',()=>{
    usePawnStore.getState().enterTutorial('forms');const s=usePawnStore.getState(),before=data()
    expect(s.transitionFloor('not-real',true)).toBe(false);expect(s.regenerateFloor('not-real')).toBe(false)
    expect(s.debugGrant('king','light')).toBe(false);expect(s.playtest({kind:'king-availability'})).toBe(false)
    expect(s.chooseTutorialForm('king' as 'knight','light')).toBe(false)
    expect(s.submitAction({kind:'transform',form:'king',attunement:'light'})).toBe(false)
    expect(data()).toEqual(before)
  })
})

describe('accurate rules, free mistakes and hidden information',()=>{
  it('rejects obstacles, occupants and out-of-range moves without turns, resources or success',()=>{
    usePawnStore.getState().enterTutorial('movement');usePawnStore.getState().nextTutorialStep(true)
    const before=usePawnStore.getState()
    for(const destination of [c(4,3),c(3,4),c(-1,3),c(5,3)])expect(usePawnStore.getState().tryMove(destination)).toBe(false)
    const after=usePawnStore.getState();expect(after.turn).toBe(before.turn);expect(after.actionId).toBe(before.actionId)
    expect(after.energy).toBe(before.energy);expect(after.tutorial?.done).toBe(false);expect(after.tutorial?.message).toContain('No turn spent')
  })
  it('deduplicates response callbacks and observes real upfront Energy then regeneration',()=>{
    usePawnStore.getState().enterTutorial('cards');usePawnStore.getState().observeTutorialUI({kind:'card-inspected',id:usePawnStore.getState().deck.hand[0].instanceId})
    usePawnStore.getState().nextTutorialStep()
    const s=usePawnStore.getState(),instance=s.deck.hand.find(card=>card.definitionId==='cut')!
    expect(s.submitAction({kind:'card',cardInstanceId:instance.instanceId,target:{kind:'enemy',enemyId:s.enemies[0].id}})).toBe(true)
    let next=usePawnStore.getState();expect(next.energy).toBe(0);expect(next.tutorial?.done).toBe(false)
    const id=next.actionId;next.advancePlayback(id,'player');next=usePawnStore.getState()
    expect(next.energy).toBe(1);expect(next.tutorial?.done).toBe(true);expect(next.turn).toBe(1)
    next.advancePlayback(id,'player');expect(usePawnStore.getState().turn).toBe(1)
    expect(usePawnStore.getState().deck.hand).toHaveLength(4)
  })
  it('keeps a completed exercise stable until Continue, with inspection and retry still free',()=>{
    usePawnStore.getState().enterTutorial('movement');performStep()
    const before=usePawnStore.getState()
    expect(before.submitAction({kind:'wait'})).toBe(false)
    expect(usePawnStore.getState().turn).toBe(before.turn)
    usePawnStore.getState().retryTutorialStep();expect(usePawnStore.getState().turn).toBe(0)
    expect(usePawnStore.getState().tutorial?.done).toBe(false)
  })
  it('teaches actual Bishop/Knight reach without adding tutorial attack exceptions',()=>{
    for(const form of ['bishop','knight'] as const){
      const session={...newTutorial(70,'forms'),step:2,form},base=tutorialExercise(session).game
      for(const [position,legal] of [[c(5,3),true],[c(4,4),form==='bishop'],[c(5,5),false]] as const){
        const state={...base,enemies:base.enemies.map(enemy=>({...enemy,cell:position,from:position}))}
        const resolved=resolveTurn(state,{kind:'attack',targetId:state.enemies[0].id})
        expect(!!resolved).toBe(legal);if(resolved)expect(resolved.turn).toBe(1)
      }
      expect(resolveTurn(base,{kind:'move',destination:c(3,2)})?.turn).toBe(1)
    }
  })
  it.each(['bishop','rook','queen'] as const)('%s keeps seven-tile clear slides and rejects fog/obstacles in tutorial arenas',form=>{
    const session={...newTutorial(71,'forms'),step:1,form},base=tutorialExercise(session).game
    const state={...base,cell:c(0,0)},destination=form==='rook'?c(7,0):c(7,7)
    expect(resolveTurn(state,{kind:'move',destination})?.turn).toBe(1)
    expect(resolveTurn({...state,visible:new Set([0,1,8,9])},{kind:'move',destination})).toBeNull()
    const blocker=form==='rook'?c(2,0):c(2,2)
    expect(resolveTurn({...state,dungeon:{...state.dungeon,tiles:state.dungeon.tiles.map(tile=>cellId(tile)===cellId(blocker)?{...tile,blocksMovement:true}:tile)}},{kind:'move',destination})).toBeNull()
  })
  it.each(bossForms)('%s can practice both attunements without consuming run charges',form=>{
    const before=data()
    for(const attunement of ['light','dark'] as const){
      usePawnStore.getState().enterTutorial('forms')
      expect(usePawnStore.getState().chooseTutorialForm(form,attunement)).toBe(true)
      for(let i=0;i<4;i++){performStep();if(i<3)usePawnStore.getState().nextTutorialStep()}
      expect(usePawnStore.getState().transformations.active?.attunement).toBe(attunement)
      usePawnStore.getState().exitTutorial();expect(data()).toEqual(before)
    }
  })
  it('fog exercises never disclose hidden targets and revoke inspection on loss of sight',()=>{
    usePawnStore.getState().enterTutorial('fog');let s=usePawnStore.getState()
    expect(inspectedEnemy(s,s.enemies[0].id)).toBeUndefined();expect(clickEnemy(s.enemies[0].id)).toBe('invalid')
    const objective=tutorialObjective(s.tutorial!,s)
    expect(tutorialObjective(s.tutorial!,{...s,enemies:[{...s.enemies[0],cell:c(7,7)}]})).toEqual(objective)
    performStep();s=usePawnStore.getState();expect(inspectedEnemy(s,s.enemies[0].id)).toBeDefined()
    s.nextTutorialStep();performStep();s=usePawnStore.getState();s.nextTutorialStep();performStep()
    s=usePawnStore.getState();expect(inspectedEnemy(s,s.enemies[0].id)).toBeUndefined();expect(s.explored.has(cellId(s.enemies[0].cell))).toBe(true)
  })
  it('diagrams use shared movement rules, distinguish symbols and stop at actual obstacles',()=>{
    for(const form of ['pawn',...bossForms,'king'] as const){
      const diagram=movementDiagram(form);expect(diagram).toHaveLength(25)
      for(const tile of diagram.filter(tile=>!['center','empty','obstacle'].includes(tile.kind)))expect(formMovement(form)(c(2,2),c(tile.x+2,tile.y+2),{size:5,blocked:[],occupied:[],visible:new Set(Array.from({length:25},(_,i)=>i))})).toBe(true)
    }
    const blocked=movementDiagram('rook',[c(3,2)])
    expect(blocked[13].kind).toBe('obstacle');expect(blocked[14].kind).toBe('empty')
    expect(renderToStaticMarkup(<MovementGuide form="bishop"/>)).toContain('up to 7')
    expect(renderToStaticMarkup(<AttackGuide form="bishop"/>)).toContain('straight 2, diagonal 1')
  })
  it('keeps panel instructions short, real controls active, and exit/retry available',()=>{
    usePawnStore.getState().enterTutorial('movement')
    const markup=renderToStaticMarkup(<TutorialPanel/>)
    expect(markup).toContain('Retry exercise');expect(markup).toContain('Skip exercise');expect(markup).toContain('Exit tutorial')
    expect(markup).not.toContain('<dialog');expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('disabled="">Continue')
    const session=newTutorial(123,'attacks'),a=tutorialExercise(session),b=tutorialExercise(session)
    expect(a).toEqual(b)
    expect(tutorialLesson('defense').steps.find(step=>step.id==='parry')?.hint).toContain('no separate manual-parry')
  })
})
