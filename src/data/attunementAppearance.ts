import type { CharacterForm } from './characterDesigns'
import type { Attunement } from './forms'
export const attunementAppearance={
  light:{name:'Hallowed corruption',construction:'symmetric',cloth:'ceremonial',stance:'ritual'},
  dark:{name:'Void corruption',construction:'fractured',cloth:'torn',stance:'guarded'},
} as const
export const equipmentByForm={
  pawn:{light:'katana',dark:'katana'},knight:{light:'lance',dark:'spear'},bishop:{light:'staff',dark:'tome'},
  rook:{light:'hallowed-hammer',dark:'void-hammer'},queen:{light:'claws',dark:'knuckles'},king:{light:'greatsword',dark:'void-greatsword'},
} as const
export function handEquipment(form:CharacterForm,variant:Attunement,side:number){
  if(form==='pawn')return undefined
  const weapon=equipmentByForm[form][variant]
  return form==='queen'||(form==='bishop'&&variant==='dark'?side===-1:side===1)?weapon:undefined
}
