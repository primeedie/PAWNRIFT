import { useArtSettings } from '../../ui/artSettingsStore'

export function DioramaLighting({viewer=false}:{viewer?:boolean}){
  const neutral=useArtSettings(state=>state.lighting==='neutral')
  return <>
    <ambientLight intensity={neutral?0.75:0.30}/>
    <hemisphereLight args={['#c7d1df','#3d3c51',neutral?0.65:0.48]}/>
    <directionalLight position={[-3,7,4]} color={neutral?'#ffffff':'#f0d9b5'} intensity={neutral?1.1:2.25}
      castShadow={!neutral} shadow-mapSize={[1024,1024]} shadow-bias={-0.0004} shadow-normalBias={0.025}
      shadow-camera-left={viewer?-2:-7} shadow-camera-right={viewer?2:7}
      shadow-camera-top={viewer?3:7} shadow-camera-bottom={viewer?-2:-7} shadow-camera-near={0.1} shadow-camera-far={24}/>
    {!neutral&&<directionalLight position={[3,4,-5]} color="#91a6d0" intensity={0.90}/>}
  </>
}
