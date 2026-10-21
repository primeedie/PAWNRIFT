export function LegalTileHighlight() {
  return (
    <group position={[0, 0.012, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.87, 0.87]} />
        <meshBasicMaterial color="#fff3b0" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.53, 0.57, 4]} />
        <meshBasicMaterial color="#fff3b0" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  )
}
