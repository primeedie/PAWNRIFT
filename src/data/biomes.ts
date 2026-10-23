export const biomes = [
  {id:'porta',name:'PORTA BARRACKS',identity:'knight',boss:'Chimera Knight',floors:6,
    quote:'The gates remember every march.',tiles:['#89917a','#4e5d52'],sides:'#3c595c',accent:'#b9a17b',motif:'barricade'},
  {id:'astra',name:'ASTRA ACADEMY',identity:'bishop',boss:'Yin and Yang Bishop',floors:6,
    quote:'A lesson survives its teacher.',tiles:['#8a8d9c','#4d526c'],sides:'#404b63',accent:'#b4a3d0',motif:'books'},
  {id:'wall',name:'THE HIGH WALL',identity:'rook',boss:'Twin Towers',floors:6,
    quote:'Stone keeps a longer watch.',tiles:['#82929a','#475d68'],sides:'#354b58',accent:'#9dbbc7',motif:'battlement'},
  {id:'castle',name:'TIMEO CASTLE',identity:'queen',boss:'Queen of Pain',floors:6,
    quote:'The crown leaves its weight behind.',tiles:['#9a8b85','#63505e'],sides:'#4c424f',accent:'#c2a572',motif:'regalia'},
] as const
export type BiomeId=typeof biomes[number]['id']
export type BiomeMotif=typeof biomes[number]['motif']
export const worldName='TIMEO KINGDOM'
export const floorLocation=(floor:number)=>({biome:biomes[Math.floor((floor-1)/6)],index:Math.floor((floor-1)/6),local:(floor-1)%6+1,boss:floor%6===0})
// Initial Stage 8 tuning, provisional rather than a quota or final economy.
export const treasureBalance={chance:0.7,weights:[[72,23,4,1],[68,24,6,2],[62,27,9,2],[58,28,11,3]]} as const
