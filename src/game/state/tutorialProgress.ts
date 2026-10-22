import { create } from 'zustand'
import { tutorials, type LessonId } from '../../data/tutorials'

const key='pawnrift:tutorial-settings:v1'
type TutorialSettings={version:1;promptSeen:boolean;completed:LessonId[]}
const empty=():TutorialSettings=>({version:1,promptSeen:false,completed:[]})
export function readTutorialSettings(storage:Pick<Storage,'getItem'>|undefined):TutorialSettings {
  try{
    const value=JSON.parse(storage?.getItem(key)??'null')
    if(value?.version!==1)return empty()
    return {version:1,promptSeen:value.promptSeen===true,completed:tutorials.filter(lesson=>Array.isArray(value.completed)&&value.completed.includes(lesson.id)).map(lesson=>lesson.id)}
  }catch{return empty()}
}
function storage(){try{return typeof localStorage==='undefined'?undefined:localStorage}catch{return undefined}}
export const useTutorialProgress=create<TutorialSettings&{
  dismissPrompt:()=>void;complete:(lesson:LessonId)=>void
}>((set,get)=>{
  const persist=(next:TutorialSettings)=>{set(next);try{storage()?.setItem(key,JSON.stringify(next))}catch{/* Practice remains available when storage is blocked. */}}
  return {...readTutorialSettings(storage()),
    dismissPrompt:()=>persist({version:1,promptSeen:true,completed:get().completed}),
    complete:lesson=>{if(!get().completed.includes(lesson))persist({version:1,promptSeen:true,completed:[...get().completed,lesson]})},
  }
})
