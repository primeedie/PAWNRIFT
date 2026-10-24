import { BufferGeometry, Float32BufferAttribute, ExtrudeGeometry, Path, Shape } from 'three'

type Station=readonly [number,number,number,number?]
// Editable sculpt profiles. Closed anatomical sections replace stretched box limbs/torso.
// Coordinates are normalized; joint lengths and weapon sockets remain in characterRig.
export function sculptSections(stations:readonly Station[],segments=12,openFront=false){
  const positions:number[]=[],indices:number[]=[]
  const count=openFront?segments+1:segments
  for(const [y,width,depth,forward=0] of stations)for(let j=0;j<count;j++){
    const angle=openFront?0.62+(Math.PI*2-1.24)*j/segments:Math.PI*2*j/segments
    const facet=Math.cos(angle*4)*0.018
    positions.push(Math.sin(angle)*width,y,Math.cos(angle)*depth+forward+facet*depth)
  }
  for(let row=0;row<stations.length-1;row++)for(let j=0;j<(openFront?segments:count);j++){
    const next=openFront?j+1:(j+1)%count,a=row*count+j,b=row*count+next,c=(row+1)*count+j,d=(row+1)*count+next
    indices.push(a,b,c,b,d,c)
  }
  if(!openFront)for(const row of [0,stations.length-1]){
    const center=positions.length/3;positions.push(0,stations[row][0],stations[row][3]??0)
    for(let j=0;j<count;j++){
      const a=row*count+j,b=row*count+(j+1)%count
      indices.push(...(row===0?[center,b,a]:[center,a,b]))
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices)
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry
}
function cloth(torn=false){
  const positions:number[]=[],indices:number[]=[],columns=8,rows=5
  for(let side=0;side<2;side++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns,v=row/rows,x=(u-0.5)*(0.72+v*0.28)
    const hem=torn&&row===rows?(col%3===0?0.13:col%2?-0.025:0.04):0
    positions.push(x,0.5-v+hem,Math.sin(u*Math.PI*5)*0.045*v+v*v*0.14+(side?0.012:-0.012))
  }
  const face=(columns+1)*(rows+1)
  for(let side=0;side<2;side++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const a=side*face+row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1
    indices.push(...(side?[a,c,b,b,c,d]:[a,b,c,b,d,c]))
  }
  // Sew the edge strip: actual thickness, rather than a double-sided flat silhouette.
  const boundary=[...Array.from({length:columns+1},(_,i)=>i),...Array.from({length:rows},(_,i)=>(i+1)*(columns+1)+columns),
    ...Array.from({length:columns},(_,i)=>rows*(columns+1)+columns-1-i),...Array.from({length:rows-1},(_,i)=>(rows-1-i)*(columns+1))]
  boundary.forEach((a,i)=>{const b=boundary[(i+1)%boundary.length];indices.push(a,b,a+face,b,b+face,a+face)})
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}
function carvedPlate(){
  const shape=new Shape();shape.moveTo(-0.48,0.38);[[0.36,0.50],[0.50,0.15],[0.32,-0.43],[-0.09,-0.50],[-0.45,-0.22]].forEach(([x,y])=>shape.lineTo(x,y));shape.closePath()
  const hole=new Path();hole.moveTo(-0.12,-0.10);hole.lineTo(0.11,-0.04);hole.lineTo(0.19,0.27);hole.lineTo(-0.05,0.16);hole.closePath();shape.holes.push(hole)
  const result=new ExtrudeGeometry(shape,{depth:0.18,bevelEnabled:true,bevelSize:0.035,bevelThickness:0.035,bevelSegments:1,steps:1});result.translate(0,0,-0.09);return result
}
export const sculpted={
  lancerTorso:sculptSections([[-0.5,0.23,0.31],[-0.17,0.32,0.38],[0.24,0.49,0.51],[0.43,0.37,0.39],[0.5,0.19,0.25]],10),
  sovereignTorso:sculptSections([[-0.5,0.42,0.40],[-0.20,0.25,0.31],[0.20,0.38,0.46],[0.40,0.43,0.40],[0.5,0.20,0.28]],12),
  fortressTorso:sculptSections([[-0.5,0.43,0.40],[-0.31,0.48,0.44],[0.32,0.52,0.49],[0.50,0.38,0.41]],4),
  royalTorso:sculptSections([[-0.5,0.33,0.36],[-0.20,0.40,0.45],[0.24,0.51,0.50],[0.43,0.47,0.43],[0.50,0.24,0.31]],8),
  queenSkirt:sculptSections([[-0.5,0.50,0.48],[-0.36,0.43,0.44],[0.1,0.23,0.29],[0.5,0.20,0.25]],12,true),
  towerSkirt:sculptSections([[-0.5,0.48,0.48],[-0.30,0.50,0.50],[0.35,0.42,0.42],[0.5,0.31,0.33]],4,true),
  cuirass:sculptSections([[-0.5,0.31,0.34],[-0.27,0.39,0.42],[0.12,0.50,0.50],[0.37,0.42,0.40],[0.5,0.24,0.30]]),
  abdomen:sculptSections([[-0.5,0.34,0.35],[-0.2,0.43,0.42],[0.25,0.42,0.44],[0.5,0.35,0.37]]),
  upperLimb:sculptSections([[-0.5,0.35,0.36],[-0.15,0.40,0.45],[0.22,0.48,0.45],[0.5,0.35,0.34]],10),
  vambrace:sculptSections([[-0.5,0.34,0.37],[-0.32,0.42,0.42],[0.23,0.50,0.51],[0.5,0.36,0.35]],10),
  pauldron:sculptSections([[-0.5,0.46,0.44],[-0.18,0.52,0.50],[0.17,0.42,0.43],[0.42,0.23,0.28],[0.5,0.05,0.08]],10),
  boot:sculptSections([[-0.5,0.48,0.50,0.18],[-0.18,0.46,0.48,0.14],[0.04,0.33,0.34],[0.50,0.30,0.29]],10),
  hand:sculptSections([[-0.5,0.32,0.33],[-0.27,0.44,0.40],[0.22,0.44,0.43],[0.5,0.28,0.30]],10),
  helm:sculptSections([[-0.5,0.32,0.35],[-0.20,0.47,0.45],[0.20,0.50,0.48],[0.42,0.35,0.36],[0.5,0.13,0.18]],12),
  hood:sculptSections([[-0.5,0.45,0.40],[-0.15,0.48,0.47],[0.25,0.43,0.42],[0.47,0.23,0.29],[0.64,0.015,0.03]],14,true),
  horse:sculptSections([[-0.5,0.28,0.31,0.24],[-0.25,0.32,0.42,0.20],[0.10,0.48,0.42],[0.40,0.39,0.37],[0.55,0.12,0.18]],12),
  robe:sculptSections([[-0.5,0.50,0.50],[-0.40,0.48,0.48],[-0.05,0.35,0.38],[0.35,0.25,0.28],[0.5,0.30,0.32]],14),
  cloth:cloth(),raggedCloth:cloth(true),fracturedPlate:carvedPlate(),
}
