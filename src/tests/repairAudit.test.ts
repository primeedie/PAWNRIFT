import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellId, cellFromId, dungeonIssues, fallbackDungeon, floorSeed, generateDungeon, layoutStyles, repairDungeon, validateDungeon } from '../game/logic/dungeon'
import { createGame, movementBoard, resolveTurn, type GameState } from '../game/logic/combat'
import { legalDestinations, sameCell, type Cell } from '../game/logic/movement'
import { applyPlaytest, mapDiagnostics, movementRejection } from '../game/logic/playtesting'
import { activateTransformation, emptyTransformations, grantTransformation } from '../game/logic/transformations'
import { usePawnStore } from '../game/state/pawnStore'
import { bossForms } from '../data/forms'
import { visibleEnemies } from '../game/logic/combatIndicators'
import { restoreAfterPanelClose } from '../ui/hudInteraction'

describe('Stage 7A.3 actual encounter generation', () => {
  it('validates 1,000 seeded encounters, with two free spawn exits, matching props and ordinary Pawn routes', () => {
    const masks = new Set<string>()
    for (let seed = 0; seed < 1000; seed++) {
      const master = `audit-repair-${seed}`, derived = floorSeed(master, 2), style = layoutStyles[seed % 4]
      const dungeon = generateDungeon(derived, style), game = createGame(dungeon)
      expect(dungeon).toEqual(generateDungeon(derived, style))
      expect(validateDungeon(dungeon)).toBe(true)
      expect(mapDiagnostics(game).issues).toEqual([])
      expect(legalDestinations(game.cell, movementBoard(game)).length).toBeGreaterThanOrEqual(2)
      expect(game.enemies.every((enemy) => !sameCell(enemy.cell, game.cell) && !dungeon.tiles[cellId(enemy.cell)].blocksMovement)).toBe(true)
      expect(dungeon.tiles).toHaveLength(64)
      const queue: Cell[] = [dungeon.spawn], reached = new Set([cellId(dungeon.spawn)])
      const board = { size: 8, available: dungeon.tiles, blocked: dungeon.tiles.filter((tile) => tile.blocksMovement), occupied: [] }
      for (let i=0;i<queue.length;i++) for (const cell of legalDestinations(queue[i], board)) if (!reached.has(cellId(cell))) { reached.add(cellId(cell));queue.push(cell) }
      expect(reached.has(cellId(dungeon.exit))).toBe(true)
      expect(reached.size).toBe(dungeon.tiles.filter((tile) => !tile.blocksMovement).length)
      expect(dungeon.tiles.every((tile) => tile.blocksMovement === ['tree','wall','rock','block'].includes(tile.prop ?? ''))).toBe(true)
      expect(dungeon.tiles.every((tile) => tile.column >= 0 && tile.column < 8 && tile.row >= 0 && tile.row < 8)).toBe(true)
      masks.add(dungeon.tiles.map((tile) => tile.blocksMovement ? '1':'0').join(''))
    }
    expect(masks.size).toBeGreaterThan(500)
  },30000)
  it.each([10,24,68,88,115])('repairs the formerly trapped initial encounter audit-repair-%i', (seed) => {
    const game=createGame(generateDungeon(`audit-repair-${seed}`))
    expect(legalDestinations(game.cell,movementBoard(game)).length).toBeGreaterThanOrEqual(2)
  })
  it('repeats the original 1,000-seed baseline with zero blocked or single-exit starts after repair', () => {
    for (let seed=0;seed<1000;seed++) {
      const state=createGame(generateDungeon(`audit-repair-${seed}`))
      expect(legalDestinations(state.cell,movementBoard(state)).length).toBeGreaterThanOrEqual(2)
    }
  },30000)
  it('repairs isolated starts, blocked exits, severed corridors, missing tiles and rendered/collision mismatches deterministically', () => {
    const base=generateDungeon('repair-scenarios','corridors')
    const broken={...base,spawn:cellFromId(0),exit:cellFromId(63),tiles:base.tiles.slice(1).map((tile)=>({...tile,blocksMovement:cellId(tile)!==27,prop:'wall' as const,blocksSight:true}))}
    expect(dungeonIssues(broken).length).toBeGreaterThan(0)
    const fixed=repairDungeon(broken)
    expect(fixed).toEqual(repairDungeon(broken))
    expect(validateDungeon(fixed)).toBe(true)
    expect(fixed.spawn).toEqual(broken.spawn)
    expect(fixed.exit).toEqual(broken.exit)
    for(const style of layoutStyles) expect(validateDungeon(fallbackDungeon('fallback',style))).toBe(true)
  })
  it('explores an ordinary route beyond initial fog using actual moves, with invalid collisions free', () => {
    let game: GameState={...createGame(generateDungeon('walk-the-route','maze')),enemies:[]}
    const initial=game.explored.size, goal=cellId(game.dungeon.exit)
    const parents=new Map<number,number>([[cellId(game.cell),-1]]), queue=[game.cell]
    const board=movementBoard(game)
    for(let i=0;i<queue.length;i++)for(const next of legalDestinations(queue[i],board))if(!parents.has(cellId(next))){parents.set(cellId(next),cellId(queue[i]));queue.push(next)}
    const route:number[]=[];let id=goal
    while(parents.get(id)!==-1){route.unshift(id);id=parents.get(id)!}
    expect(resolveTurn(game,{kind:'move',destination:{column:-1,row:0}})).toBeNull()
    for(const id of route){const turn=game.turn;game=resolveTurn(game,{kind:'move',destination:cellFromId(id)})!;expect(game.turn).toBe(turn+1);expect(game.visible.has(id)).toBe(true)}
    expect(game.explored.size).toBeGreaterThan(initial)
    expect(game.status).toBe('victory')
  })
})

describe('explicit public playtest overrides preserve normal mechanics',()=>{
  beforeEach(()=>{usePawnStore.getState().loadDungeon('public-tools','courtyard');usePawnStore.setState({transformations:emptyTransformations(),playtestMode:false,runActive:true,phase:'ready'})})
  it('grants and activates all four forms in both attunements through the real resolver without restarting',()=>{
    const state=usePawnStore.getState()
    for(const form of bossForms)for(const attunement of ['light','dark'] as const){
      state.playtest({kind:'clear-enemies'})
      const owned=usePawnStore.getState().transformations.inventory
      if(!owned.some((item)=>item.form===form)&&owned.length===2) expect(state.playtest({kind:'replace',form,attunement,replace:owned[0].form})).toBe(true)
      expect(state.debugGrant(form,attunement)).toBe(true)
      expect(state.submitAction({kind:'transform',form,attunement})).toBe(true)
      const player=usePawnStore.getState(), id=player.actionId
      expect(state.playtest({kind:'charges',form})).toBe(false)
      player.advancePlayback(id,'player');player.advancePlayback(id,'enemies')
      const active=usePawnStore.getState()
      expect(active.transformations.active).toMatchObject({form,attunement})
      const charges=active.transformations.inventory.find((item)=>item.form===form)!.charges
      expect(state.playtest({kind:'charges',form})).toBe(true)
      expect(usePawnStore.getState().transformations.inventory.find((item)=>item.form===form)!.charges).toBe(5)
      expect(charges).toBeLessThan(5)
      expect(state.playtest({kind:'duration',floors:1})).toBe(true)
      expect(state.playtest({kind:'cooldown',form})).toBe(true)
      expect(state.playtest({kind:'eye'})).toBe(true)
      const turn=usePawnStore.getState().turn
      expect(state.playtest({kind:'revert'})).toBe(true)
      expect(usePawnStore.getState().turn).toBe(turn)
      expect(usePawnStore.getState().transformations.recovery).toBe(1)
      expect(state.playtest({kind:'recovery'})).toBe(true)
      expect(usePawnStore.getState().playtestMode).toBe(true)
    }
    expect(usePawnStore.getState().transformations.inventory).toHaveLength(2)
  })
  it('regeneration preserves resources, active charges/duration, cooldowns and Eye usage; real floors derive seeds',()=>{
    const state=usePawnStore.getState()
    const forms=activateTransformation(grantTransformation(emptyTransformations(),'bishop','light')!,'bishop','light')!
    usePawnStore.setState({transformations:forms,hp:7,energy:1,focus:2,signatures:{...state.signatures,eyeUsed:true,cooldowns:{...state.signatures.cooldowns,pawn:4}},turn:5})
    const before=usePawnStore.getState()
    expect(state.regenerateFloor()).toBe(true)
    const reset=usePawnStore.getState()
    expect(reset).toMatchObject({hp:7,energy:1,focus:2,turn:5,transformations:forms})
    expect(reset.deck).toBe(before.deck)
    expect(reset.signatures.eyeUsed).toBe(true)
    expect(reset.signatures.cooldowns.pawn).toBe(4)
    expect(reset.explored).toEqual(reset.visible)
    expect(state.transitionFloor(undefined,true)).toBe(true)
    expect(usePawnStore.getState().dungeon.seed).toBe(floorSeed(before.masterSeed,2))
    expect(usePawnStore.getState().signatures.eyeUsed).toBe(false)
    expect(usePawnStore.getState().transformations.active?.floorsLeft).toBe(1)
  })
  it('spawns only on free visible walkable cells and keeps hidden entity information out of diagnostics',()=>{
    const game=createGame(generateDungeon('spawning','courtyard'))
    const spawned=applyPlaytest(game,{kind:'spawn'})!
    expect(spawned).not.toBeNull()
    const enemy=spawned.enemies.at(-1)!
    expect(game.visible.has(cellId(enemy.cell))).toBe(true)
    expect(mapDiagnostics(spawned).issues).toEqual([])
    expect(applyPlaytest(spawned,{kind:'spawn',cell:enemy.cell})).toBeNull()
    expect(applyPlaytest(game,{kind:'spawn',cell:game.cell})).toBeNull()
    expect(applyPlaytest(game,{kind:'spawn',cell:{column:-1,row:0}})).toBeNull()
    const hidden=game.dungeon.tiles.find((tile)=>!tile.blocksMovement&&!game.visible.has(cellId(tile)))!
    const hiddenEnemy={...enemy,cell:hidden,from:hidden}
    const state={...game,enemies:[hiddenEnemy]}
    expect(visibleEnemies(state)).toEqual([])
    expect(movementRejection(state,hidden)).toBe('Destination unavailable')
    expect(mapDiagnostics(state).active).toEqual(mapDiagnostics({...state,enemies:[]}).active)
    expect(mapDiagnostics({...state,enemies:[{...enemy,cell:game.cell}]}).issues).toContain('Invalid enemy occupancy')
  })
  it('keeps rejection logging opt-in and rejects all overrides during pending responses',()=>{
    const state=usePawnStore.getState(),before=usePawnStore.getState()
    state.tryMove({column:-1,row:0});expect(usePawnStore.getState()).toBe(before)
    state.setDiagnostics(true);state.tryMove({column:-1,row:0})
    expect(usePawnStore.getState().lastMovementRejection).toBe('Out of bounds')
    state.submitAction({kind:'wait'});const busy=usePawnStore.getState()
    expect(state.playtest({kind:'hp'})).toBe(false)
    expect(state.regenerateFloor()).toBe(false)
    expect(usePawnStore.getState()).toBe(busy)
  })
})

describe('HUD focus recovery',()=>{
  it('restores gameplay focus when a closing panel owns focus, without stealing focus from a newly opened panel',()=>{
    const focus={} as Node,restore=vi.fn(),contains=(node:Node|null)=>node===focus
    restoreAfterPanelClose({open:true,contains},focus,restore);expect(restore).not.toHaveBeenCalled()
    restoreAfterPanelClose({open:false,contains},focus,restore);expect(restore).toHaveBeenCalledOnce()
    restoreAfterPanelClose({open:false,contains},{} as Node,restore);expect(restore).toHaveBeenCalledOnce()
  })
})
