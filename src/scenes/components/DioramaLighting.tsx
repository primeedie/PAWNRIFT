import { useArtSettings } from '../../ui/artSettingsStore'
import { usePawnStore } from '../../game/state/pawnStore'
import { worldThemes } from '../../data/worldThemes'

export function DioramaLighting({viewer=false,neutralOverride=false}:{viewer?:boolean;neutralOverride?:boolean}){
  const selectedNeutral=useArtSettings(state=>state.lighting==='neutral'),neutral=neutralOverride||selectedNeutral
  const alignment=usePawnStore(state=>!state.training?state.floorContent?.alignment:undefined)
  const theme=!viewer&&alignment?worldThemes[alignment]:undefined
  return <>
    <ambientLight intensity={neutral?0.75:0.30}/>
    <hemisphereLight args={[neutral?'#ffffff':'#c7d1df',neutral?'#555555':'#3d3c51',neutral?0.65:0.48]}/>
    <directionalLight position={[-3,7,4]} color={neutral?'#ffffff':theme?.key??'#f0d9b5'} intensity={neutral?1.1:2.25}
      castShadow={!neutral} shadow-mapSize={[1024,1024]} shadow-bias={-0.0004} shadow-normalBias={0.025}
      shadow-camera-left={viewer?-2:-7} shadow-camera-right={viewer?2:7}
      shadow-camera-top={viewer?3:7} shadow-camera-bottom={viewer?-2:-7} shadow-camera-near={0.1} shadow-camera-far={24}/>
    {!neutral&&<directionalLight position={[3,4,-5]} color={theme?.rim??'#91a6d0'} intensity={0.90}/>}
  </>
}
