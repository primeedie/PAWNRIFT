export type BlockPool={id:string;name:string;amount:number;windowsLeft:number}
export type Fortification={damage:number;windowsLeft:number}
export const blockTotal=(pools:readonly BlockPool[])=>pools.reduce((sum,pool)=>sum+pool.amount,0)
export function blockPools(state:{block:number;blockSources:readonly BlockPool[]}) {
  const pools=state.blockSources.filter(pool=>pool.amount>0&&pool.windowsLeft>0)
  // Explicit legacy/test scalar overrides are one-response protection, never immortal.
  return blockTotal(pools)===state.block?pools.map(pool=>({...pool})):state.block>0?[{id:'override',name:'Temporary Block',amount:state.block,windowsLeft:1}]:[]
}
export function grantBlock(pools:readonly BlockPool[],pool:BlockPool) {
  return [...pools.filter(other=>other.id!==pool.id),...(pool.amount>0?[{...pool}]:[])]
}
export function spendBlock(pools:readonly BlockPool[],amount:number) {
  let remaining=amount
  return [...pools].sort((a,b)=>a.windowsLeft-b.windowsLeft||a.id.localeCompare(b.id)).map(pool=>{
    const spent=Math.min(pool.amount,remaining);remaining-=spent;return {...pool,amount:pool.amount-spent}
  }).filter(pool=>pool.amount>0)
}
export const tickBlock=(pools:readonly BlockPool[])=>pools.filter(pool=>pool.windowsLeft>1&&pool.amount>0).map(pool=>({...pool,windowsLeft:pool.windowsLeft-1}))
export function blockWindowLabel(state:{block:number;blockSources:readonly BlockPool[]}) {
  const windows=blockPools(state).map(pool=>pool.windowsLeft)
  if(!windows.length)return ''
  const low=Math.min(...windows),high=Math.max(...windows)
  return `${low===high?high:`${low}–${high}`} response${high===1?'':'s'} left`
}
