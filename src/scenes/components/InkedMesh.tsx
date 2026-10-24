import { BackSide, ShaderMaterial, Vector2, type BufferGeometry, type Material, type Mesh } from 'three'
import { useRef } from 'react'
import { useArtSettings } from '../../ui/artSettingsStore'
import { useModelComparison } from './ModelComparison'

const resolution=new Vector2()
// Inverted hull: one extra pass for selected silhouettes, no framebuffer or full-screen pass.
export const inkMaterial=new ShaderMaterial({side:BackSide,transparent:true,depthWrite:false,toneMapped:false,
  uniforms:{resolution:{value:new Vector2(1,1)},pixels:{value:1.35},fogAlpha:{value:1}},
  vertexShader:`uniform vec2 resolution; uniform float pixels;
    void main(){
      vec4 view=modelViewMatrix*vec4(position,1.0);
      vec4 clip=projectionMatrix*view;
      vec3 n=normalize(normalMatrix*normal);
      vec2 direction=(projectionMatrix*vec4(n,0.0)).xy;
      float lengthN=length(direction);
      if(lengthN>0.0001) clip.xy+=direction/lengthN*(2.0*pixels/resolution)*clip.w;
      clip.z+=0.00002*clip.w;
      gl_Position=clip;
    }`,fragmentShader:'uniform float fogAlpha; void main(){gl_FragColor=vec4(0.055,0.063,0.080,fogAlpha);}'})

export function InkHull({geometry}:{geometry:BufferGeometry}){
  const hull=useRef<Mesh>(null)
  const enabled=useArtSettings(state=>state.outlines)
  const mode=useModelComparison()
  return enabled&&mode==='final'?<mesh ref={hull} geometry={geometry} material={inkMaterial} raycast={()=>{}} renderOrder={-1}
      onBeforeRender={renderer=>{
        renderer.getDrawingBufferSize(resolution);inkMaterial.uniforms.resolution.value.copy(resolution)
        let ancestor=hull.current?.parent??null,alpha=1
        while(ancestor){if(typeof ancestor.userData.fogAmount==='number'){alpha=Math.min(1,ancestor.userData.fogAmount/0.38);break}ancestor=ancestor.parent}
        inkMaterial.uniforms.fogAlpha.value=alpha
        inkMaterial.uniforms.pixels.value=1.35*renderer.getPixelRatio();inkMaterial.uniformsNeedUpdate=true
      }}/> : null
}
export function InkedMesh({geometry,material,outline=true,castShadow=true}:{geometry:BufferGeometry;material:Material;outline?:boolean;castShadow?:boolean}){
  return <group dispose={null}>
    {outline&&<InkHull geometry={geometry}/>}
    <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow/>
  </group>
}
