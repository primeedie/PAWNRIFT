import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OrthographicCamera, type Group } from 'three'
import { characterDesigns, characterTiming, type CharacterForm } from '../data/characterDesigns'
import type { Attunement } from '../data/forms'
import type { AnimationCue } from '../utils/characterAnimation'
import { CharacterModel, type ModelPreview } from '../scenes/components/CharacterModel'
import { DioramaLighting } from '../scenes/components/DioramaLighting'
import { useArtSettings } from './artSettingsStore'
import { usePawnStore } from '../game/state/pawnStore'
import { restoreGameFocus } from './hudInteraction'
import { ArtControls } from './ArtControls'
import { ComparisonMaterials, ModelComparisonContext, type ComparisonMode } from '../scenes/components/ModelComparison'

// Each viewport owns its camera/playback. This component never calls a run or training command.
export default function ModelViewer(){
  const training=usePawnStore(state=>!!state.training),dialog=useRef<HTMLDialogElement>(null),slider=useRef<HTMLInputElement>(null),stats=useRef<HTMLOutputElement>(null)
  const [form,setForm]=useState<CharacterForm>('pawn'),[variant,setVariant]=useState<Attunement>('light'),[cue,setCue]=useState<AnimationCue>('idle')
  const [playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false)
  const [mode,setMode]=useState<ComparisonMode>('final'),[roster,setRoster]=useState(false),[scale,setScale]=useState<'close'|'game'|'thumbnail'>('close')
  const preview=useRef<ModelPreview>({cue:'idle',progress:0,time:0})
  useEffect(()=>{
    if(!training){useArtSettings.setState({viewerOpen:false});return}
    dialog.current?.showModal();setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return ()=>{dialog.current?.close();restoreGameFocus()}
  },[training])
  const reset=(next:AnimationCue)=>{setCue(next);preview.current={cue:next,progress:0,time:0};if(slider.current)slider.current.value='0'}
  return <dialog ref={dialog} className="model-viewer" aria-labelledby="model-viewer-title" onCancel={event=>{event.preventDefault();useArtSettings.setState({viewerOpen:false})}} onKeyDown={event=>event.stopPropagation()}>
    <header><h2 id="model-viewer-title">Character model viewer</h2><button onClick={()=>useArtSettings.setState({viewerOpen:false})}>Close viewer</button></header>
    <p>Isolated visual inspection. Drag to orbit, scroll/pinch to zoom. Playback never spends resources or advances a turn.</p>
    <div className="model-viewer-layout"><div className="model-viewer-canvas">
      <Canvas orthographic shadows="soft" dpr={[1,2]} camera={{position:[8,8.75,8],zoom:190,near:0.1,far:60}}>
        <color attach="background" args={[mode==='final'?'#202632':'#e6e6e6']}/><DioramaLighting viewer/>
        <ComparisonMaterials mode={mode}/><ComparisonCamera roster={roster} scale={scale}/>
        <ModelComparisonContext value={mode}>
          <ViewerRig form={form} variant={variant} reduced={reduced} preview={preview} playing={playing} slider={slider} stats={stats} roster={roster}/>
        </ModelComparisonContext>
        {mode==='final'&&!roster&&<mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-0.015,0]}><circleGeometry args={[1.35,48]}/><meshStandardMaterial color="#444856" roughness={0.93}/></mesh>}
        <OrbitControls makeDefault target={[0,0.75,0]} minZoom={18} maxZoom={400} minPolarAngle={0.18} maxPolarAngle={Math.PI/2-0.05} enablePan={false}/>
      </Canvas>
    </div><div className="model-viewer-controls">
      <label>Render mode<select value={mode} onChange={event=>setMode(event.target.value as ComparisonMode)}><option value="final">Final materials</option><option value="silhouette">Black silhouette</option><option value="gray">Neutral gray</option></select></label>
      <label><input type="checkbox" checked={roster} onChange={event=>{setRoster(event.target.checked);reset('idle')}}/>Side-by-side roster</label>
      <label>Isometric inspection scale<select value={scale} onChange={event=>setScale(event.target.value as typeof scale)}><option value="close">Close-up</option><option value="game">Gameplay</option><option value="thumbnail">Thumbnail</option></select></label>
      <label>Piece<select value={form} onChange={event=>{setForm(event.target.value as CharacterForm);reset(cue)}}>{Object.keys(characterDesigns).map(id=><option key={id}>{id}</option>)}</select></label>
      <label>Attunement<select disabled={form==='pawn'&&!roster} value={variant} onChange={event=>{setVariant(event.target.value as Attunement);reset(cue)}}><option value="light">Hallowed</option><option value="dark">Void</option></select></label>
      <p>{roster?'Six-piece roster · King Training only':<>{characterDesigns[form][variant]}{form==='pawn'?' · one uncorrupted appearance':''}{form==='king'?' · Training only':''}</>}</p>
      <label>Animation<select value={cue} onChange={event=>reset(event.target.value as AnimationCue)}>{(['idle','move','attack','signature','parry','defend','hit'] as const).map(id=><option key={id}>{id}</option>)}</select></label>
      <button onClick={()=>setPlaying(!playing)}>{playing?'Pause animation':'Play animation'}</button><button onClick={()=>reset(cue)}>Restart clip</button>
      <label>Scrub animation<input ref={slider} type="range" min="0" max="1" step="0.001" defaultValue="0" onChange={event=>{setPlaying(false);preview.current.progress=Number(event.target.value)}}/></label>
      <label><input type="checkbox" checked={reduced} onChange={event=>setReduced(event.target.checked)}/>Reduced motion</label>
      <ArtControls/><output ref={stats} aria-live="off"/>
    </div></div>
  </dialog>
}
function ViewerRig({form,variant,reduced,preview,playing,slider,stats,roster}:{form:CharacterForm;variant:Attunement;reduced:boolean;preview:RefObject<ModelPreview>;playing:boolean;slider:RefObject<HTMLInputElement|null>;stats:RefObject<HTMLOutputElement|null>;roster:boolean}){
  const root=useRef<Group>(null),monitor=useRef({elapsed:0,frames:0})
  useFrame(({gl},delta)=>{
    const p=preview.current,timing=characterTiming[form],duration=p.cue==='attack'?timing.basic:p.cue==='signature'?timing.signature:p.cue==='move'?timing.move:3000
    if(playing){p.progress=(p.progress+delta*1000/duration)%1;p.time+=delta}
    if(slider.current)slider.current.value=String(p.progress)
    if(root.current)root.current.position.y=!reduced&&p.cue==='move'&&form==='knight'?Math.sin(p.progress*Math.PI)*0.16:0
    const m=monitor.current;m.elapsed+=delta;m.frames++
    if(m.elapsed>=0.5){if(stats.current)stats.current.value=`Viewer ${Math.round(m.frames/m.elapsed)} fps · ${gl.info.render.calls} draws · ${gl.info.render.triangles} triangles`;m.elapsed=m.frames=0}
  },-2)
  const forms=Object.keys(characterDesigns) as CharacterForm[]
  return <group ref={root}>{(roster?forms:[form]).map((piece,index)=><group key={`${piece}:${variant}`} position={roster?[(index-2.5)*1.35,0,-(index-2.5)*1.35]:[0,0,0]}>
    <CharacterModel form={piece} variant={variant} reducedMotion={reduced} preview={preview}/>
  </group>)}</group>
}
function ComparisonCamera({roster,scale}:{roster:boolean;scale:'close'|'game'|'thumbnail'}){
  const {camera,size}=useThree()
  useEffect(()=>{
    if(!(camera instanceof OrthographicCamera))return
    camera.position.set(8,8.75,8);camera.lookAt(0,0.75,0)
    camera.zoom=Math.min(scale==='close'?210:scale==='game'?65:32,roster?(size.width-40)/11.5:(size.width-40)/2.4,(size.height-32)/2.2)
    camera.updateProjectionMatrix()
  },[camera,size.width,size.height,roster,scale])
  return null
}
