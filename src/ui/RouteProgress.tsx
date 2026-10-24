import { usePawnStore } from '../game/state/pawnStore'
import { alignmentCounts } from '../game/logic/floorContent'

export function RouteProgress(){
  const state=usePawnStore(),progress=state.progress
  if(state.training||!progress)return null
  const counts=alignmentCounts(progress.routes,state.floorNumber),base=Math.floor((state.floorNumber-1)/6)*6
  const cleared={light:progress.completedAlignments.filter(item=>item.alignment==='light').length,dark:progress.completedAlignments.filter(item=>item.alignment==='dark').length}
  return <section className="route-progress" aria-label="Boss alignment exit votes">
    <div className="route-vote-counts"><span>HALLOWED {counts.light}</span><span>VOID {counts.dark}</span></div>
    <div className="route-segments">{Array.from({length:5},(_,index)=>{
      const vote=progress.routes.find(vote=>vote.floor===base+index+1)
      return <span key={index} data-alignment={vote?.alignment??'empty'} aria-label={`Choice ${index+1}: ${vote?{light:'Hallowed',dark:'Void'}[vote.alignment]:'unselected'}`}/>
    })}</div>
    <div>BOSS ALIGNMENT: {counts.light+counts.dark}/5</div>
    <small>CLEARED: Hallowed {cleared.light} | Void {cleared.dark}</small>
  </section>
}
