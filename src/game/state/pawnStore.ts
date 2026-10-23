import { createTraining, trainingControl, type TrainingCommand, type TrainingSession } from '../logic/training'
import { recordAnalysis } from '../logic/combatAnalysis'
import { create } from 'zustand'
import { type Cell } from '../logic/movement'
import { floorSeed, generateDungeon, type LayoutStyle } from '../logic/dungeon'
import { attackTargets, createGame, resolvePlayerAction, resolveEnemyPhase, type GameState, type PlayerAction } from '../logic/combat'
import { newRunSeed } from '../../utils/newRunSeed'
import type { CardTarget } from '../logic/cardRules'
import { sameCell } from '../logic/movement'
import { completeTransformationFloor, grantTransformation, recordTransformationBossWin, retainAfterDeath, retentionChoices, transformationsForNewRun } from '../logic/transformations'
import { bossForms, type Attunement, type BossForm } from '../../data/forms'
import { tutorials, tutorialLesson, type LessonId } from '../../data/tutorials'
import { lessonCompleted, newTutorial, observeTutorial, tutorialExercise, tutorialRejection, tutorialStep, type PracticeForm, type TutorialSession, type TutorialSignal } from '../logic/tutorial'
import { useTutorialProgress } from './tutorialProgress'
import { newCampaign, campaignGame, advanceCampaign, enterCampaignFloor, floorToken } from '../logic/run'
import { bossVariant, floorContentIssues, pendingChest, treasureOffer, type RunProgress } from '../logic/floorContent'
import { floorLocation, type BiomeId } from '../../data/biomes'
import { deserializeRun, localRunStorage, readRunSave, runSaveKey, serializeRun } from './runPersistence'
import { emptyPassives } from '../logic/passives'
import { emptySignatures, vaultDestinations } from '../logic/signatures'
import { applyPlaytest, movementRejection, PLAYTEST_TOOLS_ENABLED, type PlaytestAction, type DiagnosticLayer } from '../logic/playtesting'

const initialDungeon = generateDungeon(newRunSeed(''))

export type TurnPhase = 'ready' | 'player' | 'enemies'
export type PawnState = GameState & {
  saveError?:string
  saveNotice?:string
  restoreRunSave:(raw?:string)=>boolean
  discardSavedRun:()=>boolean
  progress:RunProgress|null
  introBiome?:BiomeId
  leaveFloor:(token:string,alignment:Attunement)=>boolean
  skipBoss:(token:string)=>boolean
  claimTreasure:(token:string,chestId:string,choice:number|null)=>boolean
  dismissBiomeIntro:()=>void
  restartSameSeed:()=>void
  debugProgress:(floor:number,votes?:Attunement[])=>boolean
  debugChest:()=>boolean
  tutorial: TutorialSession | null
  enterTutorial: (lesson: LessonId, sequence?: boolean) => boolean
  exitTutorial: () => boolean
  requestTutorialExit: (requested:boolean) => void
  nextTutorialStep: (skip?: boolean) => boolean
  retryTutorialStep: () => boolean
  chooseTutorialForm: (form: PracticeForm, attunement: Attunement) => boolean
  observeTutorialUI: (signal: Exclude<TutorialSignal,{kind:'player'}|{kind:'response'}>) => void
  training: TrainingSession | null
  enterTraining: () => boolean
  leaveTraining: () => boolean
  train: (command: TrainingCommand) => boolean
  from: Cell
  fromElevation: number
  isMoving: boolean
  phase: TurnPhase
  actionId: number
  revealAll: boolean
  runActive: boolean
  hasStartedRun: boolean
  floorNumber: number
  masterSeed: string
  playtestMode: boolean
  diagnosticLayers: DiagnosticLayer[]
  diagnosticsEnabled: boolean
  setDiagnostics: (enabled: boolean) => void
  lastMovementRejection?: string
  recordInputBlocked: () => void
  playtest: (action: PlaytestAction) => boolean
  regenerateFloor: (seed?: string, style?: LayoutStyle) => boolean
  toggleDiagnostic: (layer: DiagnosticLayer) => void
  deathRetentionDone: boolean
  selectedAbility: boolean
  abilityDestination?: Cell
  selectAbilityDestination: (cell: Cell) => boolean
  selectAbility: () => void
  tryAbility: (targetId?: string) => boolean
  chooseRetention: (form: BossForm) => boolean
  transitionFloor: (seed?: string, testing?: boolean) => boolean
  debugGrant: (form: BossForm, attunement: Attunement) => boolean
  debugBossWin: (form: BossForm, attunement: Attunement) => void
  debugDefeat: () => void
  selectedCardId?: string
  selectCard: (instanceId?: string) => void
  playSelectedCard: (target: CardTarget) => boolean
  restartRun: () => void
  suspendRun: () => void
  resumeRun: () => void
  loadDungeon: (seed: string, style?: LayoutStyle,mode?:RunProgress['mode']) => void
  toggleReveal: () => void
  tryMove: (destination: Cell) => boolean
  tryAttack: (targetId?: string) => boolean
  submitAction: (action: PlayerAction) => boolean
  advancePlayback: (actionId: number, phase: TurnPhase) => void
}

// Complete data-only snapshot. Functions stay on the store; all gameplay data is deep copied.
let savedRun: Partial<PawnState> | undefined
let trainingId = 0
let savedTutorial: Partial<PawnState> | undefined, tutorialCheckpoint: Partial<PawnState> | undefined
const dataSnapshot=(state:PawnState)=>structuredClone(Object.fromEntries(Object.entries(state).filter(([,value])=>typeof value!=='function'))) as Partial<PawnState>
function learned(session:TutorialSession|null){if(session&&lessonCompleted(session))useTutorialProgress.getState().complete(session.lesson);return session}
export const usePawnStore = create<PawnState>((set, get) => ({
  ...createGame(initialDungeon),
  progress:null,
  restoreRunSave:raw=>{
    if(get().training)return false
    try{
      const result=raw===undefined?readRunSave():{data:deserializeRun(raw)}
      if(result.error){set({saveError:result.error});return false}
      if(!result.data)return false
      set({...result.data,saveError:undefined,saveNotice:undefined,actionId:get().actionId+1});return true
    }catch(error){set({saveError:`Run save unavailable: ${error instanceof Error?error.message:'invalid data'}. Original data preserved.`});return false}
  },
  discardSavedRun:()=>{
    if(get().training)return false
    try{localRunStorage()?.removeItem(runSaveKey);set({saveError:undefined,saveNotice:undefined,hasStartedRun:false,progress:null});return true}
    catch{set({saveError:'Unable to remove the unreadable save. Browser storage may be blocked.'});return false}
  },
  dismissBiomeIntro:()=>set({introBiome:undefined}),
  leaveFloor:(token,alignment)=>{
    const state=get()
    if(state.training||!state.runActive||state.phase!=='ready'||!['light','dark'].includes(alignment))return false
    const next=advanceCampaign(state,token,alignment)
    if(!next)return false
    set({...next,from:'cell' in next?next.cell:state.cell,fromElevation:0,isMoving:false,phase:'ready',actionId:state.actionId+1,
      revealAll:false,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,lastAction:undefined})
    return true
  },
  skipBoss:token=>{
    const state=get()
    if(!PLAYTEST_TOOLS_ENABLED||state.training||!state.runActive||state.phase!=='ready'||!state.floorContent?.boss)return false
    const next=advanceCampaign(state,token,undefined,true)
    if(!next)return false
    set({...next,from:'cell' in next?next.cell:state.cell,fromElevation:0,isMoving:false,phase:'ready',actionId:state.actionId+1,
      revealAll:false,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,lastAction:undefined})
    return true
  },
  claimTreasure:(token,chestId,choice)=>{
    const state=get(),chest=pendingChest(state)
    if(state.training||!state.runActive||state.phase!=='ready'||state.status!=='playing'||floorToken(state)!==token||!chest||chest.id!==chestId
      ||(choice!==null&&(!Number.isInteger(choice)||!chest.offer[choice])))return false
    const reward=choice===null?undefined:chest.offer[choice]
    set({floorContent:{...state.floorContent!,chests:state.floorContent!.chests.map(candidate=>candidate.id===chestId?{...candidate,state:reward?'claimed':'skipped'}:candidate)},
      deck:reward?{...state.deck,discard:[...state.deck.discard,{...reward,instanceId:`reward:${state.floorContent!.id}:${chestId}`}]}:state.deck})
    return true
  },
  restartSameSeed:()=>{const state=get();if(!state.training)state.loadDungeon(state.masterSeed,state.progress?.layouts[1]?.style,'manual')},
  debugProgress:(floor,votes)=>{
    const state=get()
    if(!PLAYTEST_TOOLS_ENABLED||state.training||!state.progress||!state.runActive||state.phase!=='ready'||state.hp<=0||!Number.isInteger(floor)||floor<1||floor>24||pendingChest(state))return false
    if(votes&&(votes.length!==5||votes.some(vote=>!['light','dark'].includes(vote))))return false
    const base=floorLocation(floor).index*6
    const routes=Array.from({length:floor-1},(_,index)=>index+1).filter(index=>index%6!==0).map(index=>({floor:index,
      alignment:votes&&index>base?votes[index-base-1]:state.progress!.routes.find(vote=>vote.floor===index)?.alignment??'light' as Attunement}))
    const progress={...state.progress,routes,cleared:Array.from({length:floor-1},(_,index)=>index+1),bossSkips:Array.from({length:Math.floor((floor-1)/6)},(_,index)=>(index+1)*6),finished:false}
    if(floor===state.floorNumber){
      const boss=state.floorContent?.boss
      set({progress,playtestMode:true,...(boss?{floorContent:{...state.floorContent!,boss:{...boss,variant:bossVariant(progress.routes,floor)}}}:{})})
      return true
    }
    const next=enterCampaignFloor(state,floor,progress,true)
    set({...next,from:next.cell,fromElevation:0,isMoving:false,phase:'ready',actionId:state.actionId+1,revealAll:false,
      selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,lastAction:undefined})
    return true
  },
  debugChest:()=>{
    const state=get(),content=state.floorContent
    if(!PLAYTEST_TOOLS_ENABLED||state.training||!content||content.boss||!state.runActive||state.phase!=='ready'||state.status!=='playing'||pendingChest(state)||content.chests.length>=4)return false
    for(const tile of state.dungeon.tiles.filter(tile=>state.visible.has(tile.row*8+tile.column)&&!tile.blocksMovement&&Math.abs(tile.column-state.cell.column)+Math.abs(tile.row-state.cell.row)===1)){
      const chest={id:`test-chest-${content.chests.length}`,cell:{column:tile.column,row:tile.row},state:'closed' as const,offer:treasureOffer(state.masterSeed,state.floorNumber,`test-chest-${content.chests.length}`)}
      const updated={...content,chests:[...content.chests,chest]}
      if(floorContentIssues(state.dungeon,updated,state.enemies.filter(enemy=>enemy.hp>0).map(enemy=>enemy.cell)).length||sameCell(tile,state.cell))continue
      set({floorContent:updated,occupied:[...state.occupied,chest.cell],playtestMode:true});return true
    }
    return false
  },
  tutorial:null,
  requestTutorialExit:requested=>set(state=>({tutorial:state.tutorial?{...state.tutorial,exitRequested:requested}:null})),
  enterTutorial:(lesson,sequence=false)=>{
    if(!tutorials.some(entry=>entry.id===lesson))return false
    const state=get()
    if(!state.tutorial)savedTutorial=dataSnapshot(state)
    const tutorial=newTutorial(++trainingId,lesson,sequence),fresh=tutorialExercise(tutorial)
    set({...fresh.game,training:fresh.session,tutorial,from:fresh.game.cell,fromElevation:0,isMoving:false,phase:'ready',runActive:true,
      actionId:state.actionId+1,revealAll:false,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,
      diagnosticLayers:[],diagnosticsEnabled:false,lastMovementRejection:undefined,lastAction:undefined})
    tutorialCheckpoint=dataSnapshot(get())
    return true
  },
  exitTutorial:()=>{
    const state=get()
    if(!state.tutorial||!savedTutorial)return false
    const methods=Object.fromEntries(Object.entries(state).filter(([,value])=>typeof value==='function'))
    const restore=savedTutorial;savedTutorial=undefined;tutorialCheckpoint=undefined
    set({...methods,...restore,tutorial:null,actionId:state.actionId+1} as PawnState,true)
    return true
  },
  nextTutorialStep:(skip=false)=>{
    const state=get(),session=state.tutorial
    if(!session||state.phase!=='ready'||(!session.done&&!skip))return false
    const lesson=tutorialLesson(session.lesson)
    const nextIndex=skip?lesson.steps.findIndex((step,index)=>index>session.step&&!!step.fixture):session.step+1
    if(nextIndex<0||nextIndex>=lesson.steps.length){
      const next=tutorials[tutorials.findIndex(lesson=>lesson.id===session.lesson)+1]
      if(session.sequence&&next)return get().enterTutorial(next.id,true)
      set({tutorial:{...session,finished:true}});return true
    }
    const tutorial={...session,step:nextIndex,done:false,message:'',accepted:undefined,paid:undefined,evidence:undefined}
    const fresh=tutorialStep(tutorial).fixture?tutorialExercise(tutorial):undefined
    set({...fresh?.game,...(fresh?{training:fresh.session}:{}),tutorial,phase:'ready',from:fresh?.game.cell??state.cell,
      fromElevation:fresh?.game.elevation??state.elevation,isMoving:false,actionId:state.actionId+1,events:[],lastAction:undefined,
      selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined})
    tutorialCheckpoint=dataSnapshot(get());return true
  },
  retryTutorialStep:()=>{
    const state=get()
    if(!state.tutorial||!tutorialCheckpoint)return false
    const checkpoint=structuredClone(tutorialCheckpoint),session=checkpoint.tutorial!
    set({...checkpoint,tutorial:{...session,done:false,finished:false,message:'',accepted:undefined,evidence:undefined,paid:undefined},actionId:state.actionId+1})
    return true
  },
  chooseTutorialForm:(form,attunement)=>{
    const state=get(),session=state.tutorial
    if(!session||session.lesson!=='forms'||state.phase!=='ready'||!bossForms.some(candidate=>candidate===form)||!['light','dark'].includes(attunement))return false
    const tutorial={...session,form,attunement,done:false,message:'',accepted:undefined,paid:undefined,evidence:undefined}
    const fresh=tutorialExercise(tutorial)
    set({...fresh.game,training:fresh.session,tutorial,from:fresh.game.cell,fromElevation:0,isMoving:false,phase:'ready',
      actionId:state.actionId+1,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,lastAction:undefined})
    tutorialCheckpoint=dataSnapshot(get());return true
  },
  observeTutorialUI:signal=>{
    const state=get()
    if(state.tutorial)set({tutorial:learned(observeTutorial(state.tutorial,state,state,signal))})
  },
  training: null,
  enterTraining: () => {
    const state = get()
    if (state.tutorial || state.training || state.phase !== 'ready') return false
    savedRun = structuredClone(Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value !== 'function'))) as Partial<PawnState>
    const fresh = createTraining(++trainingId)
    set({ ...fresh.game, training: fresh.session, from: fresh.game.cell, fromElevation: 0, isMoving: false, phase: 'ready',
      actionId: state.actionId + 1, runActive: true, revealAll: false, selectedCardId: undefined, selectedAbility: false,
      abilityDestination: undefined, diagnosticLayers: [], diagnosticsEnabled: false, lastMovementRejection: undefined, lastAction: undefined })
    return true
  },
  leaveTraining: () => {
    const state = get()
    if (state.tutorial || !state.training || !savedRun) return false
    const methods = Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value === 'function'))
    const restore = savedRun; savedRun = undefined
    set({ ...methods, ...restore, training: null, actionId: state.actionId + 1 } as PawnState, true)
    return true
  },
  train: (command) => {
    const state = get()
    if (state.tutorial || !state.training || state.phase !== 'ready') return false
    const result = trainingControl(state, state.training, command)
    if (!result) return false
    set({ ...result.game, training: result.session, actionId: state.actionId + 1, from: result.game.cell,
      fromElevation: result.game.elevation, isMoving: false, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined })
    return true
  },
  from: initialDungeon.spawn,
  fromElevation: 0,
  isMoving: false,
  phase: 'ready',
  actionId: 0,
  revealAll: false,
  runActive: false,
  hasStartedRun: false, floorNumber: 1, deathRetentionDone: false, selectedAbility: false,
  masterSeed: initialDungeon.seed, playtestMode: false, diagnosticLayers: [], diagnosticsEnabled: false,
  setDiagnostics: (enabled) => set({ diagnosticsEnabled: enabled }),
  recordInputBlocked: () => { if (get().diagnosticsEnabled && get().status === 'playing') set({ lastMovementRejection: 'Input blocked by active UI' }) },
  toggleDiagnostic: (layer) => set((state) => ({ playtestMode: true, diagnosticLayers: state.diagnosticLayers.includes(layer)
    ? state.diagnosticLayers.filter((entry) => entry !== layer) : [...state.diagnosticLayers, layer] })),
  playtest: (action) => {
    const state = get()
    if(state.tutorial)return false
    if (!state.runActive || state.phase !== 'ready') return false
    const next = applyPlaytest(state, action)
    if (!next) return false
    set({ ...next, playtestMode: true, from: next.cell, fromElevation: next.elevation, isMoving: false,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, actionId: state.actionId + 1 })
    return true
  },
  regenerateFloor: (seed, style) => {
    const state = get()
    if (state.training || !state.runActive || state.phase !== 'ready' || state.hp <= 0) return false
    if(state.progress){
      if(pendingChest(state))return false
      const progress={...state.progress,layouts:{...state.progress.layouts,[state.floorNumber]:{seed:seed??state.dungeon.seed,style:style??state.dungeon.style}}}
      const fresh=campaignGame(state.masterSeed,state.floorNumber,progress)
      if(fresh.floorContent)fresh.floorContent={...fresh.floorContent,chests:fresh.floorContent.chests.map(chest=>{
        const old=state.floorContent?.chests.find(old=>old.id===chest.id);return old?{...chest,state:old.state,offer:old.offer}:chest
      })}
      set({...fresh,progress,hp:state.hp,maxHp:state.maxHp,deck:state.deck,energy:state.energy,maxEnergy:state.maxEnergy,focus:state.focus,turn:state.turn,
        transformations:state.transformations,passives:{...state.passives},signatures:{...emptySignatures(),cooldowns:{...state.signatures.cooldowns},eyeUsed:state.signatures.eyeUsed,samuraiCharges:state.signatures.samuraiCharges},
        from:fresh.cell,fromElevation:0,isMoving:false,phase:'ready',actionId:state.actionId+1,playtestMode:true,selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,revealAll:false,lastAction:undefined})
      return true
    }
    const dungeon = generateDungeon(seed ?? state.dungeon.seed, style ?? (seed === undefined ? state.dungeon.style : undefined))
    set({ ...createGame(dungeon), hp: state.hp, maxHp: state.maxHp, deck: state.deck, energy: state.energy, maxEnergy: state.maxEnergy,
      focus: state.focus, turn: state.turn, transformations: state.transformations, passives: { ...state.passives },
      signatures: { ...emptySignatures(), cooldowns: { ...state.signatures.cooldowns }, eyeUsed: state.signatures.eyeUsed, samuraiCharges: state.signatures.samuraiCharges },
      from: dungeon.spawn, fromElevation: 0, isMoving: false, phase: 'ready', actionId: state.actionId + 1, playtestMode: true,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, revealAll: false, lastAction: undefined, lastMovementRejection: undefined })
    return true
  },
  selectAbility: () => {
    const state = get()
    if (state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ selectedAbility: !state.selectedAbility, selectedCardId: undefined, abilityDestination: undefined })
  },
  selectAbilityDestination: (cell) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready' || !state.selectedAbility
      || state.transformations.active?.form !== 'knight' || !vaultDestinations(state).some((candidate) => sameCell(candidate, cell))) return false
    set({ abilityDestination: cell }); return true
  },
  tryAbility: (targetId) => get().submitAction({ kind: 'ability', targetId, destination: get().abilityDestination }),
  chooseRetention: (form) => {
    const state = get()
    if (state.status !== 'defeat' || state.deathRetentionDone) return false
    const next = retainAfterDeath(state.transformations, form)
    if (!next) return false
    set({ transformations: next, deathRetentionDone: true })
    return true
  },
  transitionFloor: (seed, testing = false) => {
    const state = get()
    if (state.training) return false
    if ((testing && !PLAYTEST_TOOLS_ENABLED) || state.phase !== 'ready' || state.hp <= 0 || (!state.runActive)
      || (state.status !== 'victory' && !testing)) return false
    if(state.progress){
      const next=advanceCampaign(state,floorToken(state),'light',testing)
      if(!next)return false
      set({...next,from:'cell' in next?next.cell:state.cell,fromElevation:0,isMoving:false,phase:'ready',actionId:state.actionId+1,
        selectedCardId:undefined,selectedAbility:false,abilityDestination:undefined,revealAll:false,lastAction:undefined})
      return true
    }
    const dungeon = generateDungeon(seed ?? floorSeed(state.masterSeed, state.floorNumber + 1))
    set({ ...createGame(dungeon), hp: state.hp, maxHp: state.maxHp, deck: state.deck,
      energy: state.energy, maxEnergy: state.maxEnergy, focus: state.focus, turn: state.turn,
      passives: { ...emptyPassives(), ...(state.transformations.active?.form === 'king' && state.transformations.active.floorsLeft > 1
        ? { smite: state.passives.smite, kingBasics: state.passives.kingBasics } : {}) },
      transformations: completeTransformationFloor(state.transformations), floorNumber: state.floorNumber + 1,
      playtestMode: state.playtestMode || testing,
      signatures: { ...emptySignatures(), cooldowns: { ...state.signatures.cooldowns } },
      from: dungeon.spawn, fromElevation: 0, isMoving: false, phase: 'ready', actionId: state.actionId + 1,
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, revealAll: false, lastAction: undefined })
    return true
  },
  debugGrant: (form, attunement) => {
    const state = get()
    if(state.tutorial)return false
    if (form === 'king' && !state.training) return false
    if (!PLAYTEST_TOOLS_ENABLED || !state.runActive || state.phase !== 'ready' || state.status !== 'playing') return false
    const next = grantTransformation(state.transformations, form, attunement)
    if (!next) return false
    set({ transformations: next, playtestMode: true }); return true
  },
  debugBossWin: (form, attunement) => {
    const state = get()
    if (!state.training && PLAYTEST_TOOLS_ENABLED && state.runActive && state.phase === 'ready' && state.status === 'playing')
      set({ transformations: recordTransformationBossWin(state.transformations, form, attunement), playtestMode: true })
  },
  debugDefeat: () => {
    if (PLAYTEST_TOOLS_ENABLED && get().runActive && get().status === 'playing' && get().phase === 'ready') set((state) => ({ hp: 0, status: 'defeat', passives: emptyPassives(), block:0,blockSources:[],fortified:undefined,preparedCounter:0, signatures:{...state.signatures,samuraiCharges:0,parryReady:false},
      selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, deathRetentionDone: false, playtestMode: true, actionId: state.actionId + 1 }))
  },
  selectedCardId: undefined,
  selectCard: (instanceId) => {
    const state = get()
    if (instanceId === undefined) { set({ selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined }); return }
    if (state.runActive && state.phase === 'ready' && state.status === 'playing'
      && state.deck.hand.some((card) => card.instanceId === instanceId))
      set({ selectedCardId: state.selectedCardId === instanceId ? undefined : instanceId, selectedAbility: false, abilityDestination: undefined })
  },
  playSelectedCard: (target) => {
    const cardInstanceId = get().selectedCardId
    return cardInstanceId ? get().submitAction({ kind: 'card', cardInstanceId, target }) : false
  },
  restartRun: () => { const state = get(); if (state.training) state.train({ kind: 'reset' }); else state.loadDungeon(newRunSeed(state.masterSeed),undefined,'random') },
  suspendRun: () => set((state) => ({ runActive: false, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined, actionId: state.actionId + 1 })),
  resumeRun: () => set((state) => ({ runActive: true, actionId: state.actionId + 1 })),
  loadDungeon: (seed, style,mode='manual') => {
    const state = get()
    seed=seed.trim()
    if (state.training||state.saveError||!seed||seed.length>200||/[\u0000-\u001f]/.test(seed)) return
    if (state.status === 'defeat' && !state.deathRetentionDone && retentionChoices(state.transformations).length) return
    const retained = state.status === 'defeat' && !state.deathRetentionDone
      ? retainAfterDeath(state.transformations)! : transformationsForNewRun(state.transformations)
    const fresh=newCampaign(seed,newRunSeed(seed),mode,style)
    set({ ...fresh, from: fresh.cell, fromElevation: 0, isMoving: false, phase: 'ready',
      transformations: transformationsForNewRun(retained), floorNumber: 1, masterSeed: seed, hasStartedRun: true, deathRetentionDone: false, selectedAbility: false, abilityDestination: undefined,
      playtestMode: state.playtestMode && (retained.inventory.length > 0 || retained.recovery > 0 || Object.keys(retained.reconstruction).length > 0), diagnosticLayers: [], diagnosticsEnabled: false, lastMovementRejection: undefined,
      actionId: get().actionId + 1, revealAll: false, runActive: true, selectedCardId: undefined, lastAction: undefined })
  },
  toggleReveal: () => set((state) => ({ revealAll: !state.revealAll, playtestMode: true })),
  tryMove: (destination) => get().submitAction({ kind: 'move', destination }),
  tryAttack: (targetId) => {
    const target = targetId ?? attackTargets(get())[0]?.id
    if(!target&&get().tutorial){const state=get();set({tutorial:{...state.tutorial!,message:'No eligible visible target in basic range. Inspection is free; attacks need a clear lane. No turn spent.'}})}
    return target ? get().submitAction({ kind: 'attack', targetId: target }) : false
  },
  submitAction: (action) => {
    const state = get()
    if (!state.runActive || state.phase !== 'ready') {
      if (action.kind === 'move' && state.diagnosticsEnabled && state.status === 'playing') set({ lastMovementRejection: !state.runActive ? 'Run suspended' : 'Action resolving' })
      return false
    }
    if(state.tutorial?.done||state.tutorial?.finished){set({tutorial:{...state.tutorial,message:'Objective complete. Continue, choose a lesson, or Retry to practice again.'}});return false}
    if(state.tutorial&&action.kind==='transform'&&action.form==='king')return false
    const player = resolvePlayerAction(state, action)
    if (!player) {
      if(state.tutorial)set({tutorial:{...state.tutorial,message:tutorialRejection(state,action)}})
      if (action.kind === 'move' && state.diagnosticsEnabled && state.status === 'playing') set({ lastMovementRejection: movementRejection(state, action.destination) ?? 'Move rejected' })
      return false
    }
    set({ ...player, selectedCardId: undefined, selectedAbility: false, abilityDestination: undefined,
      tutorial:state.tutorial?observeTutorial(state.tutorial,state,player,{kind:'player',action}):null,
      lastMovementRejection: undefined,
      from: state.cell, fromElevation: state.elevation, isMoving: !sameCell(player.cell, state.cell), phase: 'player', actionId: state.actionId + 1 })
    return true
  },
  advancePlayback: (id, phase) => {
    const state = get()
    // Stale, duplicate, and pre-regeneration callbacks cannot process a turn twice.
    if (!state.runActive || state.actionId !== id || state.phase !== phase || phase === 'ready') return
    if (state.status === 'defeat' || state.hp <= 0) {
      set({ status: 'defeat', hp: 0, passives: emptyPassives(), block:0,blockSources:[],fortified:undefined,preparedCounter:0, signatures:{...state.signatures,samuraiCharges:0,parryReady:false}, phase: 'ready', isMoving: false, guarding: false, actionId: state.actionId + 1 })
      return
    }
    if (phase === 'player') {
      const resolved = resolveEnemyPhase(state)
      set({ ...resolved,tutorial:state.tutorial?learned(observeTutorial(state.tutorial,state,resolved,{kind:'response'})):null,
        training: state.training ? { ...state.training, analysis: recordAnalysis(state.training.analysis, resolved.events, state.actionId) } : null, from: state.cell, isMoving: false,
        phase: resolved.status === 'defeat' ? 'ready' : 'enemies',
        actionId: resolved.status === 'defeat' ? state.actionId + 1 : state.actionId })
    }
    else set({ phase: 'ready' })
  },
}))

// Save only the actual run. Training/tutorial snapshots never replace browser storage.
const restoredRun=readRunSave()
if(restoredRun.data)usePawnStore.setState({...restoredRun.data,actionId:1})
if(restoredRun.error)usePawnStore.setState({saveError:restoredRun.error})
usePawnStore.subscribe(state=>{
  const storage=localRunStorage()
  if(state.training||state.tutorial||!state.progress||!state.hasStartedRun||state.saveError)return
  if(!storage){if(typeof window!=='undefined'&&!state.saveNotice)usePawnStore.setState({saveNotice:'Run could not be saved in this browser. Keep this tab open to continue.'});return}
  try{storage.setItem(runSaveKey,serializeRun(state))}
  catch{if(!state.saveNotice)usePawnStore.setState({saveNotice:'Run could not be saved in this browser. Keep this tab open to continue.'})}
})
