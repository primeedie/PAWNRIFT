import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePawnStore } from '../game/state/pawnStore'
import { createTraining, defaultDummy, dummyEnemy, trainingControl } from '../game/logic/training'
import { resolvePlayerAction } from '../game/logic/combat'
import { testForms, formSymbols } from '../data/forms'
import { signatureAbilities } from '../data/abilities'
import { aimBasicAttack, clickEnemy, connectInspection, consumeInspectionBoardClick, fitInspectionPanels, inspectedEnemy, useInspectionStore } from '../ui/inspectionStore'
import { characterStats, signatureInfo } from '../ui/inspectionPresentation'
import { CharacterInformation, EnemyInformation } from '../ui/InspectionPanels'
import { TransformationHUD } from '../ui/TransformationHUD'
import { EnemyHealthBar } from '../ui/EnemyHealthBar'
import { keywordEvents, createHoverScheduler } from '../ui/tooltipEvents'

vi.mock('../game/state/pawnStore', async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../game/state/pawnStore')>()
  return {...actual,usePawnStore:Object.assign((selector?: (s:ReturnType<typeof actual.usePawnStore.getState>)=>unknown)=>selector?selector(actual.usePawnStore.getState()):actual.usePawnStore.getState(),actual.usePawnStore)}
})
vi.mock('../ui/inspectionStore', async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../ui/inspectionStore')>()
  return {...actual,useInspectionStore:Object.assign((selector?: (s:ReturnType<typeof actual.useInspectionStore.getState>)=>unknown)=>selector?selector(actual.useInspectionStore.getState()):actual.useInspectionStore.getState(),actual.useInspectionStore)}
})
const cell=(column:number,row:number)=>({column,row})
const initial=usePawnStore.getState()
let disconnect:()=>void
function finish(){let s=usePawnStore.getState();s.advancePlayback(s.actionId,'player');s=usePawnStore.getState();s.advancePlayback(s.actionId,'enemies')}
function equip(form:'pawn'|typeof testForms[number],attunement:'light'|'dark'='light'){
  const s=usePawnStore.getState(),next=trainingControl(s,s.training!,{kind:'form',form,attunement})!
  usePawnStore.setState({...next.game,training:next.session})
}
beforeEach(()=>{
  const setup=createTraining(1)
  usePawnStore.setState({...setup.game,training:setup.session,runActive:true,phase:'ready',actionId:0,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined})
  useInspectionStore.getState().dismiss();disconnect=connectInspection()
})
afterEach(()=>{disconnect();usePawnStore.setState(initial,true);useInspectionStore.getState().dismiss();vi.useRealTimers()})

describe('deliberate, free character and enemy inspection',()=>{
  it('toggles one visible enemy, changes selection, and toggles character information without touching any game field',()=>{
    usePawnStore.setState({enemies:[dummyEnemy(defaultDummy()),dummyEnemy(defaultDummy(1,cell(3,4)))]})
    const before=usePawnStore.getState(),ui=useInspectionStore.getState()
    expect(clickEnemy('dummy-1')).toBe('inspect');expect(useInspectionStore.getState().enemyId).toBe('dummy-1')
    ui.toggleCharacter();expect(useInspectionStore.getState().characterOpen).toBe(true)
    expect(clickEnemy('dummy-2')).toBe('inspect');expect(useInspectionStore.getState().enemyId).toBe('dummy-2')
    expect(clickEnemy('dummy-2')).toBe('inspect');expect(useInspectionStore.getState().enemyId).toBeUndefined()
    ui.toggleCharacter();expect(useInspectionStore.getState().characterOpen).toBe(false)
    expect(usePawnStore.getState()).toBe(before)
  })
  it('clears concealed/dead selections immediately, never restores them on reveal, and rejects hidden clicks even in debug reveal',()=>{
    clickEnemy('dummy-1')
    const s=usePawnStore.getState()
    usePawnStore.setState({visible:new Set(),revealAll:true})
    expect(useInspectionStore.getState().enemyId).toBeUndefined()
    expect(clickEnemy('dummy-1')).toBe('invalid')
    expect(renderToStaticMarkup(<EnemyInformation/>)).toBe('')
    usePawnStore.setState({visible:s.visible})
    expect(useInspectionStore.getState().enemyId).toBeUndefined()
    clickEnemy('dummy-1');usePawnStore.setState({enemies:[{...s.enemies[0],hp:0}]})
    expect(useInspectionStore.getState().enemyId).toBeUndefined()
  })
  it('updates selected information live, but reveals neither another visible foe nor hidden live HP',()=>{
    const spec={...defaultDummy(),rank:'boss' as const,behavior:'sparring' as const,defense:7,block:4}
    usePawnStore.setState(s=>({enemies:[{...dummyEnemy(spec),hp:777,block:1,bleed:[{turnsLeft:1,appliedTurn:0},{turnsLeft:3,appliedTurn:2}],concussion:2},
      {...dummyEnemy(defaultDummy(1,cell(3,4))),hp:12345,maxHp:20000}],training:{...s.training!,dummies:[spec]}}))
    clickEnemy('dummy-1')
    const html=renderToStaticMarkup(<EnemyInformation/>)
    expect(html).toContain('777/1000');expect(html).toContain('sparring');expect(html).toContain('boss')
    expect(html).toContain('remaining ticks 1, 3');expect(html).toContain('Concussion: 2 responses')
    expect(html).toContain('7 / 4');expect(html).not.toContain('12345')
    usePawnStore.setState(s=>({enemies:s.enemies.map(e=>e.id==='dummy-1'?{...e,hp:700}:e)}))
    expect(renderToStaticMarkup(<EnemyInformation/>)).toContain('700/1000')
    usePawnStore.setState({visible:new Set()})
    expect(inspectedEnemy(usePawnStore.getState(),'dummy-1')).toBeUndefined()
    expect(renderToStaticMarkup(<EnemyInformation/>)).toBe('')
  })
  it('dismisses free on ordinary board clicks, then permits the next click; active targeting never falls through to movement',()=>{
    useInspectionStore.getState().toggleCharacter();const before=usePawnStore.getState()
    expect(consumeInspectionBoardClick()).toBe(true)
    expect(usePawnStore.getState()).toBe(before)
    expect(consumeInspectionBoardClick()).toBe(false)
    expect(aimBasicAttack()).toBe(true)
    expect(consumeInspectionBoardClick()).toBe(true)
    expect(usePawnStore.getState().turn).toBe(0)
    const card=usePawnStore.getState().deck.hand[0];usePawnStore.getState().selectCard(card.instanceId)
    expect(useInspectionStore.getState().aimingAttack).toBe(false)
    expect(consumeInspectionBoardClick()).toBe(false)
  })
  it('closes presentation state on floor/session/menu boundaries and preserves desktop coexistence without resizing the game',()=>{
    const ui=useInspectionStore.getState(),game=usePawnStore.getState()
    ui.toggleCharacter();clickEnemy('dummy-1')
    for(const width of [1366,1440,1920,2560]) {fitInspectionPanels(width);expect(useInspectionStore.getState()).toMatchObject({characterOpen:true,enemyId:'dummy-1'})}
    fitInspectionPanels(900);expect(useInspectionStore.getState()).toMatchObject({characterOpen:false,enemyId:'dummy-1'})
    ui.toggleCharacter();fitInspectionPanels(900);expect(useInspectionStore.getState()).toMatchObject({characterOpen:true,enemyId:undefined})
    expect(usePawnStore.getState()).toBe(game)
    usePawnStore.setState({dungeon:{...game.dungeon}});expect(useInspectionStore.getState().characterOpen).toBe(false)
    ui.toggleCharacter();usePawnStore.getState().suspendRun();expect(useInspectionStore.getState().characterOpen).toBe(false)
  })
})

describe('combat targeting has priority over enemy inspection',()=>{
  it('arms a free basic aim, rejects an invalid target without inspection, and resolves one valid attack/response',()=>{
    usePawnStore.setState(s=>({enemies:[...s.enemies,dummyEnemy(defaultDummy(1,cell(7,7)))]}))
    expect(aimBasicAttack()).toBe(true);expect(usePawnStore.getState().turn).toBe(0)
    const before=usePawnStore.getState()
    expect(clickEnemy('dummy-2')).toBe('invalid');expect(usePawnStore.getState()).toBe(before)
    expect(useInspectionStore.getState()).toMatchObject({aimingAttack:true,enemyId:undefined})
    expect(clickEnemy('dummy-1')).toBe('action');const accepted=usePawnStore.getState()
    expect(accepted.enemies[0].hp).toBe(997);expect(clickEnemy('dummy-1')).toBe('inspect') // inspection remains free while resolution presents
    finish();expect(usePawnStore.getState().turn).toBe(1)
    accepted.advancePlayback(accepted.actionId,'player');expect(usePawnStore.getState().turn).toBe(1)
  })
  it('preserves E/Attack behavior and live inspection, with no extra response from inspecting',()=>{
    clickEnemy('dummy-1');expect(usePawnStore.getState().tryAttack()).toBe(true)
    expect(useInspectionStore.getState().enemyId).toBe('dummy-1')
    expect(renderToStaticMarkup(<EnemyInformation/>)).toContain('997/1000')
    finish();expect(usePawnStore.getState().turn).toBe(1)
    expect(usePawnStore.getState().events.filter(e=>e.actor==='dummy-1'&&e.kind==='wait')).toHaveLength(1)
  })
  it('honors cards and invalid card targets without accidental basic attacks or inspection',()=>{
    const s=usePawnStore.getState(),all=[...s.deck.hand,...s.deck.draw],cut=all.find(c=>c.definitionId==='cut')!
    usePawnStore.setState({deck:{...s.deck,hand:[cut],draw:all.filter(c=>c!==cut)},enemies:[...s.enemies,dummyEnemy(defaultDummy(1,cell(7,7)))]})
    s.selectCard(cut.instanceId);const before=usePawnStore.getState()
    expect(clickEnemy('dummy-2')).toBe('invalid');expect(usePawnStore.getState()).toBe(before)
    expect(clickEnemy('dummy-1')).toBe('action');expect(usePawnStore.getState().enemies[0].hp).toBe(996)
    expect(usePawnStore.getState().energy).toBe(2);expect(useInspectionStore.getState().enemyId).toBeUndefined()
    finish();expect(usePawnStore.getState().turn).toBe(1)
  })
  it('routes Knight landing/target selection through the signature resolver and keeps self abilities on their explicit control',()=>{
    usePawnStore.getState().selectAbility();const self=usePawnStore.getState()
    expect(clickEnemy('dummy-1')).toBe('invalid');expect(usePawnStore.getState()).toBe(self)
    self.selectCard(undefined);equip('knight')
    usePawnStore.setState({enemies:[dummyEnemy(defaultDummy(0,cell(6,4))),dummyEnemy(defaultDummy(1,cell(6,6)))]})
    const s=usePawnStore.getState();s.selectAbility();expect(s.selectAbilityDestination(cell(5,4))).toBe(true)
    const aimed=usePawnStore.getState();expect(clickEnemy('dummy-2')).toBe('invalid');expect(usePawnStore.getState()).toBe(aimed)
    expect(clickEnemy('dummy-1')).toBe('action');expect(usePawnStore.getState().cell).toEqual(cell(5,4))
    expect(usePawnStore.getState().signatures.cooldowns.knight).toBe(7)
    finish();expect(usePawnStore.getState().turn).toBe(1)
  })
  it.each(['queen','king'] as const)('validates the clicked %s target before confirming its explicit area ability',form=>{
    equip(form)
    usePawnStore.setState(s=>({enemies:[...s.enemies,dummyEnemy(defaultDummy(1,cell(7,7)))]}))
    usePawnStore.getState().selectAbility();const before=usePawnStore.getState()
    expect(clickEnemy('dummy-2')).toBe('invalid');expect(usePawnStore.getState()).toBe(before)
    expect(clickEnemy('dummy-1')).toBe('action');finish()
    expect(usePawnStore.getState().turn).toBe(1);expect(useInspectionStore.getState().enemyId).toBeUndefined()
  })
})

describe('readable live character information with shared tooltips',()=>{
  it('keeps a constant icon trigger for every form/attunement while information is closed or open, including training King',()=>{
    for(const form of ['pawn',...testForms] as const)for(const attunement of ['light','dark'] as const){
      equip(form,attunement);const before=usePawnStore.getState()
      const closed=renderToStaticMarkup(<TransformationHUD/>)
      expect(closed).toContain('form-identity-icon');expect(closed).toContain(formSymbols[form]);expect(closed).toContain('aria-expanded="false"')
      expect(closed).toContain('aria-controls="character-information"');expect(closed).toContain(signatureAbilities[form].name)
      useInspectionStore.getState().toggleCharacter()
      const open=renderToStaticMarkup(<TransformationHUD/>),panel=renderToStaticMarkup(<CharacterInformation/>)
      expect(open).toContain('aria-expanded="true"');expect(panel).toContain(signatureAbilities[form].name)
      expect(panel).toContain('character-information');expect(usePawnStore.getState()).toBe(before)
      useInspectionStore.getState().closeCharacter()
    }
  })
  it('derives the displayed main/bonus damage from actual configured combat and updates stacks/resources live',()=>{
    for(const form of ['pawn',...testForms] as const)for(const attunement of ['light','dark'] as const){
      equip(form,attunement);usePawnStore.setState(s=>({focus:2,passives:{...s.passives,sharpener:3,smite:0,smiteTurn:undefined,smiteSpent:0}}))
      const state=usePawnStore.getState(),stats=characterStats(state),result=resolvePlayerAction(state,{kind:'attack',targetId:'dummy-1'})!
      const hits=result.events.filter(e=>e.breakdown),main=hits[0].breakdown!
      expect(stats.damage).toBe(main.base+(main.attunement??0)+(main.focus??0))
      expect(stats.bonus).toBe(form==='pawn'?hits[1].breakdown?.passive:form==='king'?main.passive:0)
      expect(stats.basicBlock).toBe(result.block)
    }
    equip('pawn');useInspectionStore.getState().toggleCharacter()
    usePawnStore.setState(s=>({passives:{...s.passives,sharpener:5},block:4}))
    const html=renderToStaticMarkup(<CharacterInformation/>);expect(html).toContain('5/5');expect(html).toContain('Current Block')
  })
  it('uses configured cooldown/usage limits and Light/Dark descriptions, never an unimplemented stat',()=>{
    equip('bishop');let s=usePawnStore.getState();expect(signatureInfo(s).limit).toBe('Once per floor')
    usePawnStore.setState({signatures:{...s.signatures,eyeUsed:true}});expect(signatureInfo(usePawnStore.getState()).status).toBe('Used this floor')
    equip('rook','dark');s=usePawnStore.getState();expect(signatureInfo(s).description).toContain('8 Block');expect(signatureInfo(s).limit).toBe('Cooldown: 9 turns')
    useInspectionStore.getState().toggleCharacter();expect(renderToStaticMarkup(<CharacterInformation/>)).not.toContain('Armor rating')
  })
  it('delays hover, shows focus information, and routes clicks only to the free stats toggle',()=>{
    vi.useFakeTimers();const show=vi.fn(),hover=vi.fn(),before=usePawnStore.getState(),trigger={} as HTMLButtonElement
    const schedule=createHoverScheduler(hover),events=keywordEvents(show,()=>schedule.cancel(),el=>schedule.queue(el),()=>useInspectionStore.getState().toggleCharacter())
    events.onPointerEnter({pointerType:'mouse',currentTarget:trigger});vi.advanceTimersByTime(299)
    expect(hover).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(hover).toHaveBeenCalledOnce()
    expect(useInspectionStore.getState().characterOpen).toBe(false)
    events.onFocus({currentTarget:trigger});expect(show).toHaveBeenCalledOnce()
    const stop=vi.fn();events.onClick({currentTarget:trigger,stopPropagation:stop})
    expect(useInspectionStore.getState().characterOpen).toBe(true);expect(stop).toHaveBeenCalledOnce()
    expect(usePawnStore.getState()).toBe(before)
  })
  it('renders only an accessible, text-free overhead bar with the correct fill',()=>{
    const html=renderToStaticMarkup(<EnemyHealthBar hp={982} maxHp={1000}/>)
    expect(html.replace(/<[^>]*>/g,'')).toBe('');expect(html).toContain('width:98.2%')
    expect(html).toContain('role="progressbar"');expect(html).not.toContain('Dummy');expect(html).not.toContain('Rookling')
  })
})
