import { Canvas } from '@react-three/fiber'
import { DungeonBoard } from './components/DungeonBoard'
import { IsometricCamera } from './components/IsometricCamera'
import { PawnCharacter } from './components/PawnCharacter'
import { DungeonEnemies } from './components/DungeonEnemies'
import { CombatFeedback } from './components/CombatFeedback'
import { BOARD_TARGET, CAMERA_POSITION } from '../utils/boardFraming'
import { DiagnosticOverlay } from './components/DiagnosticOverlay'

export default function FoundationScene() {
  return (
    <div className="scene-canvas" role="group" aria-label="PAWNRIFT dungeon. Move with WASD or arrow keys. Click an adjacent enemy or press E to attack, Q to defend, Space to wait.">
      <Canvas
        gl={{ alpha: true }}
        orthographic
        camera={{ position: CAMERA_POSITION, near: 0.1, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(...BOARD_TARGET)}
        frameloop="demand"
        dpr={[1, 2]}
        fallback={<p className="scene-loading" role="status">This preview needs a browser with WebGL support.</p>}
      >
        <ambientLight intensity={0.8} />
        <hemisphereLight args={['#e2e5db', '#667583', 0.55]} />
        <directionalLight position={[-3, 8, 5]} color="#eee7dc" intensity={0.95} />
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
