import { canInteract, pendingChest } from './floorContent'
import { cellId } from './dungeon'
import type { GameState } from './combat'
import type { Attunement } from '../../data/forms'
import type { Cell } from './movement'

export type Interactable={id:string;cell:Cell;label:string}&({kind:'chest';chestId:string}|{kind:'exit';alignment:Attunement})
export function eligibleInteractions(state:GameState):Interactable[]{
  const content=state.floorContent
  if(!content||state.mode==='training'||state.status!=='playing'||pendingChest(state))return []
  const chests:Interactable[]=content.chests.filter(chest=>chest.state==='closed'&&canInteract(state,chest.cell))
    .map(chest=>({kind:'chest',id:`chest:${chest.id}`,chestId:chest.id,cell:chest.cell,label:'Open Chest'}))
  const exits:Interactable[]=state.enemies.some(enemy=>enemy.hp>0)?[]:content.exits.filter(exit=>canInteract(state,exit.cell,true))
    .map(exit=>({kind:'exit',id:`exit:${exit.alignment}`,alignment:exit.alignment,cell:exit.cell,label:exit.alignment==='light'?'Enter Hallow':'Enter Void'}))
  const distance=(cell:Cell)=>Math.abs(cell.column-state.cell.column)+Math.abs(cell.row-state.cell.row)
  return [...chests,...exits].sort((a,b)=>distance(a.cell)-distance(b.cell)||(a.kind===b.kind?0:a.kind==='chest'?-1:1)||cellId(a.cell)-cellId(b.cell))
}
