import { afterEach, expect, it, vi } from 'vitest'
import { act, createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { PortaEnemyModel } from '../scenes/components/PortaEnemyModel'
import { ModelComparisonContext } from '../scenes/components/ModelComparison'
import { createEnemy, planEnemyAttack } from '../game/logic/enemyTactics'
import { enemyIds, enemies } from '../data/enemies'
import { usePawnStore } from '../game/state/pawnStore'
import { createGame } from '../game/logic/combat'
import { trainingArena } from '../game/logic/training'

const saved=usePawnStore.getState()
afterEach(()=>{usePawnStore.setState(saved,true);vi.unstubAllGlobals()})
it('mounts the real roster, preserves two equine heads and fixed weapon contacts through preparation/strike in four facings',async()=>{
  extend({Group:THREE.Group,Mesh:THREE.Mesh})
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  const root=createRoot({} as HTMLCanvasElement),renderer={render(){},setPixelRatio(){},setSize(){},xr:{addEventListener(){},removeEventListener(){}},shadowMap:{enabled:false},info:{render:{calls:0,triangles:0}}}
  await root.configure({gl:renderer as unknown as THREE.WebGLRenderer,frameloop:'never',dpr:1,size:{width:1000,height:500,top:0,left:0}})
  try{
    for(const target of [{column:3,row:3},{column:3,row:1},{column:4,row:2},{column:2,row:2}])for(const cue of ['prepare','strike'] as const){
      const game={...createGame(trainingArena()),cell:target}
      const actors=enemyIds.flatMap((id,index)=>(['light','dark'] as const).map(variant=>{
        const enemy=createEnemy(id,`${index}-${variant}`,{column:3,row:2},variant)
        enemy.tactics!.pending=cue==='prepare'?planEnemyAttack(game,enemy,enemies[id].patterns.find(p=>!['command','fractured-guard'].includes(p))!):undefined
        return enemy
      }))
      usePawnStore.setState({cell:target,phase:cue==='prepare'?'ready':'enemies',runActive:true,actionId:usePawnStore.getState().actionId+1,
        enemies:actors,events:cue==='strike'?actors.map((enemy,id)=>({id,kind:'miss',actor:enemy.id,cell:target,seen:true})):[]})
      let store:ReturnType<typeof root.render>
      await act(async()=>{store=root.render(<ModelComparisonContext value="gray"><group>{actors.map(enemy=><group key={enemy.id} name={enemy.id}><PortaEnemyModel enemy={enemy}/></group>)}</group></ModelComparisonContext>)})
      const scene=store!.getState(),turn=usePawnStore.getState().turn
      for(let frame=0;frame<2;frame++)for(const sub of scene.internal.subscribers)sub.ref.current(scene,frame===0?.324:0,undefined)
      scene.scene.updateMatrixWorld(true)
      for(const actor of actors){
        const model=scene.scene.getObjectByName(actor.id)!
        expect(model).toBeDefined()
        for(const side of ['left','right']){
          const contact=model.getObjectByName(`enemy-${side}-weapon-contact`),hand=model.getObjectByName(`enemy-${side}-grip`)
          if(!contact)continue
          expect(hand).toBeDefined()
          expect(hand!.getWorldPosition(new THREE.Vector3()).distanceTo(contact.getWorldPosition(new THREE.Vector3()))).toBeLessThan(.003)
        }
        if(actor.kind==='chimera-knight'){
          const a=model.getObjectByName('chimera-horse-head-left'),b=model.getObjectByName('chimera-horse-head-right')
          expect(a).toBeDefined();expect(b).toBeDefined()
          expect(a!.getWorldPosition(new THREE.Vector3()).distanceTo(b!.getWorldPosition(new THREE.Vector3()))).toBeGreaterThan(.3)
        }
        const bounds=new THREE.Box3().setFromObject(model)
        expect(bounds.min.y).toBeGreaterThan(-.03);expect(bounds.max.y).toBeLessThan(1.8)
      }
      expect(usePawnStore.getState().turn).toBe(turn)
    }
  }finally{await act(async()=>root.unmount())}
})
