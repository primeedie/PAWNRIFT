import { Canvas } from '@react-three/fiber'
import { DungeonBoard } from './components/DungeonBoard'
import { IsometricCamera } from './components/IsometricCamera'
import { PawnCharacter } from './components/PawnCharacter'
import { DungeonEnemies } from './components/DungeonEnemies'
import { CombatFeedback } from './components/CombatFeedback'
import { BOARD_TARGET, CAMERA_POSITION } from '../utils/boardFraming'
import { DiagnosticOverlay } from './components/DiagnosticOverlay'
import { useInspectionStore } from '../ui/inspectionStore'
import { DioramaLighting } from './components/DioramaLighting'

export default function FoundationScene() {
  return (
    <div className="scene-canvas" role="group" aria-label="PAWNRIFT dungeon. Move with WASD or arrow keys. Click an enemy to inspect. E attacks; Choose target aims a mouse attack. Q defends, Space waits.">
      <Canvas
        gl={{ alpha: true }}
        shadows="soft"
        orthographic
        camera={{ position: CAMERA_POSITION, near: 0.1, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(...BOARD_TARGET)}
        onPointerMissed={()=>useInspectionStore.getState().dismiss()}
        frameloop="demand"
        dpr={[1, 2]}
        fallback={<p className="scene-loading" role="status">This preview needs a browser with WebGL support.</p>}
      >
        <DioramaLighting/>
        <IsometricCamera />
        <DungeonBoard />
        <DiagnosticOverlay />
        <PawnCharacter />
        <DungeonEnemies />
        <CombatFeedback />
      </Canvas>
    </div>
  )
}
