import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePawnStore } from '../game/state/pawnStore'
import { initialWorldAlignment, worldAlignment, createCampaignFloor, completedAlignmentHistory, type RouteVote } from '../game/logic/floorContent'
import { floorToken } from '../game/logic/run'
import { deserializeRun, serializeRun } from '../game/state/runPersistence'
import { eligibleInteractions } from '../game/logic/interactions'
import { contextAction, requestInteraction, focusInteraction, focusedInteraction, confirmExit, cancelExit, useInteractionStore } from '../ui/interactionStore'
import { useInspectionStore } from '../ui/inspectionStore'
import { emptyTransformations } from '../game/logic/transformations'
import { cellFromId, cellId, neighborIds } from '../game/logic/dungeon'
import { sameCell } from '../game/logic/movement'
import { updateFog } from '../game/logic/visibility'
import { RouteProgress } from '../ui/RouteProgress'
import { onPawnKeyDown } from '../ui/usePawnKeyboard'
import { exitDialogKey } from '../ui/ExitConfirmation'
import { TerrainTile } from '../scenes/components/TerrainTile'
import { biomes } from '../data/biomes'
import { geometry } from '../scenes/components/CharacterParts'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'

vi.mock('../game/state/pawnStore',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../game/state/pawnStore')>()
  return {...actual,usePawnStore:Object.assign((selector?:(state:ReturnType<typeof actual.usePawnStore.getState>)=>unknown)=>{
    const state=actual.usePawnStore.getState();return selector?selector(state):state
  },actual.usePawnStore)}
})
const original=usePawnStore.getState()
beforeEach(()=>{usePawnStore.setState({...original,transformations:emptyTransformations(),saveError:undefined},true);usePawnStore.getState().loadDungeon('alignment-test');cancelExit();useInspectionStore.getState().dismiss()})
afterEach(()=>{cancelExit();vi.restoreAllMocks();vi.unstubAllGlobals();usePawnStore.setState(original,true);useInspectionStore.getState().dismiss()})
function atExit(alignment:'light'|'dark'){
  const s=usePawnStore.getState(),exit=s.floorContent!.exits.find(exit=>exit.alignment===alignment)!
  usePawnStore.setState({cell:exit.cell,from:exit.cell,enemies:[],...updateFog(s.dungeon.tiles,exit.cell)})
}
function finish(){const s=usePawnStore.getState();s.advancePlayback(s.actionId,'player');usePawnStore.getState().advancePlayback(s.actionId,'enemies')}
function chestSetup(){
  for(let seed=0;seed<100;seed++){usePawnStore.getState().loadDungeon(`context-chest-${seed}`);if(usePawnStore.getState().floorContent?.chests.length)break}
  const s=usePawnStore.getState(),chest=s.floorContent!.chests[0],cell=neighborIds(cellId(chest.cell)).map(cellFromId).find(cell=>s.dungeon.tiles.some(tile=>sameCell(cell,tile)&&!tile.blocksMovement))!
  usePawnStore.setState({cell,from:cell,enemies:[],...updateFog(s.dungeon.tiles,cell)})
  return chest
}
describe('world themes and independent progression records',()=>{
  it('uses a reproducible isolated coin toss, without initial votes or deck/layout perturbation',()=>{
    let light=0
    for(let i=0;i<1000;i++){
      const master=`world-${i}`,a=createCampaignFloor(master,1,[]),b=createCampaignFloor(master,1,[])
      expect(a).toEqual(b);expect(a.content.alignment).toBe(initialWorldAlignment(master));light+=a.content.alignment==='light'?1:0
    }
    expect(light).toBeGreaterThan(430);expect(light).toBeLessThan(570)
    const s=usePawnStore.getState();expect(s.progress?.routes).toEqual([]);expect(s.progress?.completedAlignments).toEqual([])
  },30000)
  it('counts actual themes separately from exit votes and carries the fifth exit beyond the majority boss',()=>{
    const start=usePawnStore.getState().floorContent!.alignment
    atExit(start==='light'?'dark':'light');expect(contextAction()).toBe(true);expect(confirmExit()).toBe(true)
    let s=usePawnStore.getState();expect(s.progress?.completedAlignments).toEqual([{floor:1,alignment:start}]);expect(s.progress?.routes[0].alignment).not.toBe(start)
    expect(s.floorContent?.alignment).not.toBe(start)
    const votes=['light','light','light','dark','dark'] as const
    for(let floor=2;floor<=5;floor++){atExit(votes[floor-1]);requestInteraction(`exit:${votes[floor-1]}`);expect(confirmExit()).toBe(true)}
    // The first vote varied with the coin toss; use explicit tools to test the strict 3–2 boundary.
    usePawnStore.getState().debugProgress(6,[...votes]);s=usePawnStore.getState()
    expect(s.floorContent?.alignment).toBe('light');expect(s.floorContent?.boss?.variant).toBe('light')
    expect(s.skipBoss(floorToken(s))).toBe(true);s=usePawnStore.getState()
    expect(s.floorContent?.alignment).toBe('dark');expect(s.progress?.completedAlignments).toHaveLength(5);expect(s.progress?.routes).toHaveLength(5)
    expect(s.progress?.bossSkips).toEqual([6]);expect(s.playtestMode).toBe(true)
  })
  it('preserves initial/current themes and both histories across save/resume and regeneration',()=>{
    atExit('dark');requestInteraction('exit:dark');confirmExit()
    const s=usePawnStore.getState(),data=deserializeRun(serializeRun(s))
    expect(data.floorContent?.alignment).toBe('dark');expect(data.progress).toEqual(s.progress)
    s.regenerateFloor('replacement','courtyard');expect(usePawnStore.getState().progress?.routes).toEqual(s.progress?.routes);expect(usePawnStore.getState().progress?.completedAlignments).toEqual(s.progress?.completedAlignments);expect(usePawnStore.getState().floorContent?.alignment).toBe('dark')
    const old=JSON.parse(serializeRun(s));old.version=1;delete old.data.progress.initialAlignment;delete old.data.progress.completedAlignments;delete old.data.floorContent.alignment
    const migrated=deserializeRun(JSON.stringify(old));expect(migrated.progress).toEqual(s.progress);expect(migrated.dungeon).toEqual(s.dungeon);expect(migrated.deck).toEqual(s.deck);expect(migrated.saveNotice).toContain('inferred')
    old.version=2;expect(()=>deserializeRun(JSON.stringify(old))).toThrow('initial world alignment')
  })
  it('retains ordered votes per biome, and counts normal cleared themes without fake boss clears',()=>{
    const routes:RouteVote[]=[1,2,3,4,5,7,8,9,10,11].map(floor=>({floor,alignment:floor<4?'light':'dark'}))
    expect(worldAlignment('world',6,routes)).toBe('light');expect(worldAlignment('world',7,routes)).toBe('dark');expect(worldAlignment('world',12,routes)).toBe('dark')
    expect(completedAlignmentHistory('world',[1,2,3,4,5,6],routes)).toHaveLength(5)
    usePawnStore.getState().debugProgress(6,['light','dark','light','light','dark'])
    const markup=renderToStaticMarkup(<RouteProgress/>);expect((markup.match(/data-alignment=/g)||[])).toHaveLength(5)
    expect([...markup.matchAll(/data-alignment="([^"]+)"/g)].map(match=>match[1])).toEqual(['light','dark','light','light','dark'])
    expect(markup).toContain('BOSS ALIGNMENT: 5/5');expect(markup).toContain('CLEARED:')
  })
  it('keeps biome checker parity while producing different shared theme materials',()=>{
    for(const biome of biomes){
      const tile=(alignment:'light'|'dark',row=0)=>TerrainTile({column:0,row,biome:biome.id,alignment}).props.children[1].props.material
      expect(tile('light')).not.toBe(tile('dark'));expect(tile('light')).not.toBe(tile('light',1));expect(tile('light')).toBe(tile('light',2))
    }
  })
})
describe('one context action and guarded free confirmation',()=>{
  it('routes real E, Enter and Escape handlers once, with modal locks and key-repeat protection',()=>{
    vi.stubGlobal('HTMLElement',class {})
    vi.stubGlobal('document',{querySelector:()=>null,querySelectorAll:()=>[]})
    const key=(key:string,repeat=false)=>({key,repeat,target:null,preventDefault:vi.fn(),stopPropagation:vi.fn()} as unknown as KeyboardEvent)
    atExit('dark');const before=usePawnStore.getState()
    onPawnKeyDown(key('e'));expect(useInteractionStore.getState().pending).toBeDefined()
    onPawnKeyDown(key('e'));expect(usePawnStore.getState().phase).toBe('ready')
    exitDialogKey(key('Escape'));expect(useInteractionStore.getState().pending).toBeUndefined();expect(usePawnStore.getState().progress).toEqual(before.progress)
    onPawnKeyDown(key('e',true));expect(useInteractionStore.getState().pending).toBeUndefined()
    onPawnKeyDown(key('e'));exitDialogKey(key('Enter',true));expect(usePawnStore.getState().floorNumber).toBe(1)
    exitDialogKey(key('Enter'));exitDialogKey(key('Enter'));expect(usePawnStore.getState().floorNumber).toBe(2);expect(usePawnStore.getState().turn).toBe(before.turn)
    const attack=vi.fn(()=>false);usePawnStore.setState({tryAttack:attack,floorContent:undefined});onPawnKeyDown(key('e'));expect(attack).toHaveBeenCalledTimes(1)
    vi.stubGlobal('document',{querySelector:()=>({open:true})});onPawnKeyDown(key('e'));expect(attack).toHaveBeenCalledTimes(1)
  })
  it('opens and cancels freely, confirms once and rejects stale/repeated requests',()=>{
    atExit('dark');const before=usePawnStore.getState(),snapshot=structuredClone(before.progress)
    expect(contextAction()).toBe(true);expect(useInteractionStore.getState().pending?.alignment).toBe('dark')
    expect(contextAction()).toBe(false);expect(usePawnStore.getState().turn).toBe(before.turn);expect(usePawnStore.getState().progress).toEqual(snapshot)
    cancelExit();expect(usePawnStore.getState().progress).toEqual(snapshot);expect(confirmExit()).toBe(false)
    requestInteraction('exit:dark');expect(confirmExit()).toBe(true);expect(confirmExit()).toBe(false)
    const after=usePawnStore.getState();expect(after.floorNumber).toBe(2);expect(after.turn).toBe(before.turn);expect(after.progress?.routes).toHaveLength(1)
    atExit('light');requestInteraction('exit:light');usePawnStore.getState().suspendRun();expect(confirmExit()).toBe(false);expect(usePawnStore.getState().floorNumber).toBe(2)
  })
  it('requires sight, adjacency, floor clearance and ready input; focused selection is stable',()=>{
    atExit('light');expect(eligibleInteractions(usePawnStore.getState()).some(item=>item.id==='exit:light')).toBe(true)
    focusInteraction('exit:light');expect(focusedInteraction()?.id).toBe('exit:light');expect(focusedInteraction()?.id).toBe('exit:light')
    usePawnStore.setState({visible:new Set()});expect(requestInteraction('exit:light')).toBe(false)
    atExit('light');usePawnStore.setState({phase:'player'});expect(requestInteraction('exit:light')).toBe(false)
    usePawnStore.setState({phase:'ready',cell:{column:0,row:0}});expect(requestInteraction('exit:light')).toBe(false)
  })
  it('uses the existing attack path by default and when explicit combat targeting wins over a chest',()=>{
    const attack=vi.fn(()=>false);usePawnStore.setState({tryAttack:attack,floorContent:undefined});contextAction();expect(attack).toHaveBeenCalledTimes(1)
    const chest=chestSetup();usePawnStore.setState({tryAttack:attack});useInspectionStore.setState({aimingAttack:true})
    contextAction();expect(attack).toHaveBeenCalledTimes(2);expect(usePawnStore.getState().floorContent?.chests[0].state).toBe('closed')
    useInspectionStore.setState({aimingAttack:false});focusInteraction(`chest:${chest.id}`);expect(contextAction()).toBe(true)
    expect(attack).toHaveBeenCalledTimes(2);expect(usePawnStore.getState().phase).toBe('player');expect(contextAction()).toBe(false)
    finish();const s=usePawnStore.getState();expect(s.turn).toBe(1);expect(s.claimTreasure(floorToken(s),chest.id,0)).toBe(true)
    expect(usePawnStore.getState().claimTreasure(floorToken(s),chest.id,0)).toBe(false);expect(usePawnStore.getState().turn).toBe(1)
  })
})
describe('chess geometry has defining negative spaces',()=>{
  it('leaves a real diagonal Bishop notch and a real Rook battlement opening',()=>{
    for(const [shape,x,y] of [['chessMitre',0.22,0.30],['towerHelm',0.18,0.40]] as const){
      const mesh=new Mesh(geometry[shape],new MeshBasicMaterial());mesh.updateMatrixWorld()
      expect(new Raycaster(new Vector3(x,y,2),new Vector3(0,0,-1)).intersectObject(mesh)).toHaveLength(0)
      expect(new Raycaster(new Vector3(0,-0.25,2),new Vector3(0,0,-1)).intersectObject(mesh).length).toBeGreaterThan(0)
    }
  })
})
